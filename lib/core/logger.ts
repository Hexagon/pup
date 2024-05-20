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

type AttachedLogger = (severity: string, category: string, text: string, process?: ProcessConfiguration, timeStamp?: number) => boolean

class Logger {
  private config: GlobalLoggerConfiguration = {}
  private attachedLogger?: AttachedLogger
  private storeName: string
  private kv: KV

  constructor(globalConfiguration: GlobalLoggerConfiguration, storeName: string) {
    this.config = globalConfiguration
    this.storeName = storeName
    this.kv = new KV({ autoSync: false })
  }

  public async init(): Promise<void> {
    await this.kv.open(this.storeName)
  }

  // Used for attaching the logger hook
  public attach(pluginLogger: AttachedLogger) {
    this.attachedLogger = pluginLogger
  }

  // Prepare log event selector
  private prepareSelector(processId?: string, startTimeStamp?: number, endTimeStamp?: number): KVQuery {
    const key: KVQuery = processId ? ["logs_by_time", {}, processId] : ["logs_by_time"]
    if (startTimeStamp || endTimeStamp) {
      const rangeSelector: KVQueryRange = {}
      if (startTimeStamp) {
        rangeSelector.from = startTimeStamp
      }
      if (endTimeStamp) {
        rangeSelector.to = endTimeStamp
      }
      key.push(rangeSelector)
    }
    return key
  }

  // Fetch logs from store
  private async fetchLogsFromStore(selector: KVQuery, nRows?: number): Promise<LogEventData[]> {
    const result = await this.kv.listAll(selector)
    const resultArray: LogEventData[] = []
    for await (const res of result) {
      resultArray.push(res.data as LogEventData)
    }
    if (nRows) {
      const spliceNumber = Math.max(0, resultArray.length - nRows)
      resultArray.splice(0, spliceNumber)
    }
    return resultArray
  }

  public async getLogContents(processId?: string, startTimeStamp?: number, endTimeStamp?: number, nRows?: number): Promise<LogEventData[]> {
    const selector = this.prepareSelector(processId, startTimeStamp, endTimeStamp)
    return await this.fetchLogsFromStore(selector, nRows)
  }

  public async getLogsByProcess(processId: string, nRows?: number): Promise<LogEventData[]> {
    return await this.getLogContents(processId, undefined, undefined, nRows)
  }

  public async getLogsByTime(startTimeStamp: number, endTimeStamp: number, nRows?: number): Promise<LogEventData[]> {
    return await this.getLogContents(undefined, startTimeStamp, endTimeStamp, nRows)
  }

  public async getLogsByProcessAndTime(processId: string, startTimeStamp: number, endTimeStamp: number, nRows?: number): Promise<LogEventData[]> {
    return await this.getLogContents(processId, startTimeStamp, endTimeStamp, nRows)
  }

  private async internalLog(severity: string, category: string, text: string, process?: ProcessConfiguration, timeStamp?: number) {
    // Default initiator to core
    const initiator = process?.id || "core"

    timeStamp = timeStamp || Date.now()

    // Write to persistent log store (if a name is supplied and internal logging is enabled)
    const logHours = this.config.internalLogHours === undefined ? 72 : this.config.internalLogHours
    if (this.storeName && logHours > 0) {
      // Ignore errors when writing to log store
      try {
        const logObj: LogEventData = {
          severity,
          category,
          text: text.length > KV_LIMIT_STRING_LENGTH_BYTES ? text.substring(0, KV_LIMIT_STRING_LENGTH_BYTES) + "..." : text,
          processId: initiator,
          timeStamp: timeStamp,
        }
        await this.kv.set(["logs_by_time", timeStamp, initiator], logObj)
      } catch (e) {
        console.error("Error while writing to log store", e)
      }
    }

    // Delegate to attached logger if there is one
    let blockedByAttachedLogger = false
    if (this.attachedLogger) {
      // Do not trust the attached logger
      try {
        blockedByAttachedLogger = this.attachedLogger(severity, category, text, process, timeStamp)
      } catch (e) {
        console.error("Error in attached logger: ", e)
      }
    }

    // Quit early if an attached logger request it
    if (blockedByAttachedLogger) return

    // Log to console
    const logToConsoleProcess = (process?.logger?.console ?? true) === false
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
    const decorateProcessFiles = process?.logger?.decorateFiles ?? false
    // If stderr is not defined but stdout is, use the stdout file
    const stderrProcessFileName = process?.logger?.stderr ?? process?.logger?.stdout
    if (isStdErr && stderrProcessFileName) {
      this.writeFile(stderrProcessFileName, decorateProcessFiles ? decoratedLogText : text)
    }
    if (!isStdErr && process?.logger?.stdout) {
      this.writeFile(process?.logger?.stdout, decorateProcessFiles ? decoratedLogText : text)
    }
  }

  private async writeFile(fileName: string, text: string, quiet = false) {
    // Strip colors
    text = stripAnsi(text)
    try {
      await writeFile(fileName, `${text}\n`, { mode: "a+" })
    } catch (_e) {
      if (!quiet) console.error(`Failed to write log '${fileName}'. The following message were not logged: ${text}.`)
    }
  }

  public async generic(severity: string, category: string, text: string, process?: ProcessConfiguration, timestamp?: number) {
    if (severity === "log" || severity === "info" || severity === "warn" || severity === "error") {
      await this.internalLog(severity, category, text, process, timestamp)
    } else {
      this.warn("logger", "Log with invalid severity received, text: ${text}")
    }
  }

  public async log(category: string, text: string, process?: ProcessConfiguration, timestamp?: number) {
    await this.internalLog("log", category, text, process, timestamp)
  }
  public async info(category: string, text: string, process?: ProcessConfiguration, timestamp?: number) {
    await this.internalLog("info", category, text, process, timestamp)
  }
  public async warn(category: string, text: string, process?: ProcessConfiguration, timestamp?: number) {
    await this.internalLog("warn", category, text, process, timestamp)
  }
  public async error(category: string, text: string, process?: ProcessConfiguration, timestamp?: number) {
    await this.internalLog("error", category, text, process, timestamp)
  }
  public async purge(keepHours: number): Promise<number> {
    if (!this.storeName) {
      return 0
    }

    try {
      const now = Date.now()
      const startTime = now - keepHours * 60 * 60 * 1000
      const logsByTimeSelector: KVQuery = ["logs_by_time", { to: startTime }]
      let rowsDeleted = 0
      for await (const entry of this.kv.iterate(logsByTimeSelector)) {
        await this.kv.delete(entry.key)
        rowsDeleted++
      }
      await this.kv.vacuum()
      return rowsDeleted
    } catch (error) {
      this.log("error", `Failed to purge logs from store '${this.storeName}': ${error.message}`)
      return 0
    }
  }
}

export { Logger }

export type { AttachedLogger }
