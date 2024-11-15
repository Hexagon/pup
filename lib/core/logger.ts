/**
 * Defines the default logger class, and related types.
 * Also handles the currently attached logger of Pup.
 *
 * @file      lib/core/logger.ts
 * @license   MIT
 */

import { stripAnsi } from "@cross/utils"
import { type GlobalLoggerConfiguration, KV_LIMIT_STRING_LENGTH_BYTES, type ProcessConfiguration } from "./configuration.ts"
import { KV, KVQuery, KVQueryRange } from "@cross/kv"
import { writeFile } from "@cross/fs"

export interface LogEvent {
  severity: string
  category: string
  text: string
  process?: ProcessConfiguration
}

export interface LogEventData {
  severity: string
  category: string
  text: string
  processId: string
  timeStamp: number
}

type AttachedLogger = (severity: string, category: string, text: string, processConf?: ProcessConfiguration, timeStamp?: number) => boolean

class Logger {
  private config: GlobalLoggerConfiguration = {}
  private attachedLogger?: AttachedLogger
  private storeName?: string
  private kv: KV

  constructor(globalConfiguration: GlobalLoggerConfiguration, storeName?: string) {
    this.config = globalConfiguration
    this.storeName = storeName
    this.kv = new KV({ autoSync: false })
  }

  public async init(): Promise<void> {
    await this.kv.open(this.storeName!)

    // Forcefully unlock ledger in case of a stale lock, this can be done as there is other means of preventing multiple running instances
    await this.kv.forceUnlockLedger()
  }

  // Used for attaching the logger hook
  public attach(pluginLogger: AttachedLogger) {
    this.attachedLogger = pluginLogger
  }

  // Prepare log event selector
  private prepareSelector(processId?: string, startTimeStamp?: number, endTimeStamp?: number, severity?: string): KVQuery {
    const key: KVQuery = ["logs_by_time"]
    if (startTimeStamp || endTimeStamp) {
      const rangeSelector: KVQueryRange = {}
      if (startTimeStamp) {
        rangeSelector.from = startTimeStamp
      }
      if (endTimeStamp) {
        rangeSelector.to = endTimeStamp
      }
      key.push(rangeSelector)
    } else if (processId || severity) {
      key.push({})
    }
    if (processId) {
      key.push(processId)
    } else {
      key.push({})
    }
    if (severity) {
      key.push(severity)
    }
    return key
  }

  // Fetch logs from store
  private async fetchLogsFromStore(selector: KVQuery, nRows?: number): Promise<LogEventData[]> {
    const resultArray: LogEventData[] = []

    // Use the generator for efficient iteration
    for await (const { data } of this.kv.iterate<LogEventData>(selector, nRows, true)) {
      resultArray.unshift(data)
    }
    return resultArray
  }

  public async getLogContents(processId?: string, startTimeStamp?: number, endTimeStamp?: number, severity?: string, nRows?: number): Promise<LogEventData[]> {
    const selector = this.prepareSelector(processId, startTimeStamp, endTimeStamp, severity)
    return await this.fetchLogsFromStore(selector, nRows)
  }

  public async getLogsByProcess(processId: string, nRows?: number): Promise<LogEventData[]> {
    return await this.getLogContents(processId, undefined, undefined, undefined, nRows)
  }

  public async getLogsByTime(startTimeStamp: number, endTimeStamp: number, nRows?: number): Promise<LogEventData[]> {
    return await this.getLogContents(undefined, startTimeStamp, endTimeStamp, undefined, nRows)
  }

  public async getLogsByProcessAndTime(processId: string, startTimeStamp: number, endTimeStamp: number, nRows?: number): Promise<LogEventData[]> {
    return await this.getLogContents(processId, startTimeStamp, endTimeStamp, undefined, nRows)
  }

  private async internalLog(severity: string, category: string, text: string, processConf?: ProcessConfiguration, timeStamp?: number) {
    // Default initiator to core
    const initiator = processConf?.id || "core"

    timeStamp = timeStamp || Date.now()

    // Write to persistent log store (if a name is supplied and internal logging is enabled)
    const logHours = this.config.internalLogHours === undefined ? 72 : this.config.internalLogHours
    if (this.kv.isOpen() && logHours > 0) {
      // Ignore errors when writing to log store
      try {
        const logObj: LogEventData = {
          severity,
          category,
          text: text.length > KV_LIMIT_STRING_LENGTH_BYTES ? text.substring(0, KV_LIMIT_STRING_LENGTH_BYTES) + "..." : text,
          processId: initiator,
          timeStamp: timeStamp,
        }
        // Append a random uuid to the key, in case two logs should arrive at the same time
        await this.kv.defer(this.kv.set<LogEventData>(["logs_by_time", timeStamp, initiator, severity, crypto.randomUUID()], logObj))
      } catch (e) {
        console.error("Error while writing to log store", e)
      }
    }

    // Delegate to attached logger if there is one
    let blockedByAttachedLogger = false
    if (this.attachedLogger) {
      // Do not trust the attached logger
      try {
        blockedByAttachedLogger = this.attachedLogger(severity, category, text, processConf, timeStamp)
      } catch (e) {
        console.error("Error in attached logger: ", e)
      }
    }

    // Quit early if an attached logger request it
    if (blockedByAttachedLogger) return

    // Log to console
    const logToConsoleProcess = (processConf?.logger?.console ?? true) === false
    const logToConsoleGlobal = (this.config?.console ?? true) === false
    const logToConsole = !logToConsoleGlobal && !logToConsoleProcess
    const isStdErr = severity === "error" || category === "stderr"

    // Prepare decorated log text
    const decoratedLogText = `${new Date(timeStamp).toISOString()} [${severity.toUpperCase()}] [${initiator}:${category}] ${text}`

    if (logToConsole) {
      const logWithColors = this.config.colors ?? true
      const decorateConsole = this.config.decorate ?? true

      let color = null

      // Apply coloring rules
      if (logWithColors) {
        if (initiator === "core") color = "gray"
        if (category === "starting") color = "green"
        if (category === "finished") color = "yellow"
        if (isStdErr) color = "red"
      }

      // Write to console
      let logFn = console.log
      if (severity === "warn") logFn = console.warn
      if (severity === "info") logFn = console.info
      if (severity === "error") logFn = console.error
      if (color !== null) {
        if (decorateConsole) {
          logFn(`%c${decoratedLogText}`, `color: ${color}`)
        } else {
          logFn(`%c${text}`, `color: ${color}`)
        }
      } else {
        logFn(decorateConsole ? decoratedLogText : text)
      }
    }

    // Write to global log file(s)
    const decorateGlobalFiles = this.config.decorateFiles ?? (this.config.decorate ?? true)
    // If stderr is not defined but stdout is, use the stdout file
    const stderrFileName = this.config.stderr ?? this.config.stdout
    if (isStdErr && stderrFileName) {
      this.writeFile(stderrFileName, decorateGlobalFiles ? decoratedLogText : text)
    }
    if (!isStdErr && this.config.stdout) {
      this.writeFile(this.config.stdout, decorateGlobalFiles ? decoratedLogText : text)
    }

    // Write process log file(s)
    const decorateProcessFiles = processConf?.logger?.decorateFiles ?? false
    // If stderr is not defined but stdout is, use the stdout file
    const stderrProcessFileName = processConf?.logger?.stderr ?? processConf?.logger?.stdout
    if (isStdErr && stderrProcessFileName) {
      this.writeFile(stderrProcessFileName, decorateProcessFiles ? decoratedLogText : text)
    }
    if (!isStdErr && processConf?.logger?.stdout) {
      this.writeFile(processConf?.logger?.stdout, decorateProcessFiles ? decoratedLogText : text)
    }
  }

  private async writeFile(fileName: string, text: string, quiet = false) {
    // Strip colors
    text = stripAnsi(text)
    try {
      await writeFile(fileName, `${text}\n`, { flag: "a+" })
    } catch (_e) {
      if (!quiet) console.error(`Failed to write log '${fileName}'. The following message were not logged: ${text}.`)
    }
  }

  public async generic(severity: string, category: string, text: string, processConf?: ProcessConfiguration, timestamp?: number) {
    if (severity === "log" || severity === "info" || severity === "warn" || severity === "error") {
      await this.internalLog(severity, category, text, processConf, timestamp)
    } else {
      this.warn("logger", "Log with invalid severity received, text: ${text}")
    }
  }

  public async log(category: string, text: string, processConf?: ProcessConfiguration, timestamp?: number) {
    await this.internalLog("log", category, text, processConf, timestamp)
  }
  public async info(category: string, text: string, processConf?: ProcessConfiguration, timestamp?: number) {
    await this.internalLog("info", category, text, processConf, timestamp)
  }
  public async warn(category: string, text: string, processConf?: ProcessConfiguration, timestamp?: number) {
    await this.internalLog("warn", category, text, processConf, timestamp)
  }
  public async error(category: string, text: string, processConf?: ProcessConfiguration, timestamp?: number) {
    await this.internalLog("error", category, text, processConf, timestamp)
  }
  public async purge(keepHours: number): Promise<number> {
    if (!this.kv?.isOpen()) {
      return 0
    }

    try {
      const now = Date.now()
      const startTime = now - keepHours * 60 * 60 * 1000
      const logsByTimeSelector: KVQuery = ["logs_by_time", { to: startTime }]
      let rowsDeleted = 0
      for await (const entry of this.kv.iterate(logsByTimeSelector)) {
        await this.kv.defer(this.kv.delete(entry.key))
        rowsDeleted++
      }
      await this.kv.defer(this.kv.vacuum())
      return rowsDeleted
    } catch (error) {
      this.log("error", `Failed to purge logs from store '${this.storeName}': ${error instanceof Error ? error.message : "Unknown"}`)
      return 0
    }
  }
  /**
   * Gracefully shut down the logger, allowing an optional timeout
   */
  public async cleanup(timeoutMs = 5000) {
    try {
      await this.kv?.close(timeoutMs)
    } catch (e) {
      console.error("Error while closing kv store: " + (e instanceof Error ? e.message : "Unknown"))
    }
  }
}

export { Logger }

export type { AttachedLogger }
