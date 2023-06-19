/**
 * Defines the default logger class, and related types.
 * Also handles the currently attached logger of Pup.
 *
 * @file      lib/core/logger.ts
 * @license   MIT
 */

import { stripColor } from "../../deps.ts"
import { GlobalLoggerConfiguration, ProcessConfiguration } from "./configuration.ts"

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
  private storeName?: string

  constructor(globalConfiguration: GlobalLoggerConfiguration, storeName?: string) {
    this.config = globalConfiguration
    this.storeName = storeName
  }

  // Used for attaching the logger hook
  public attach(pluginLogger: AttachedLogger) {
    this.attachedLogger = pluginLogger
  }

  public async getLogContents(processId?: string, startTimeStamp?: number, endTimeStamp?: number, nRows?: number): Promise<LogEventData[]> {
    const store = await Deno.openKv(this.storeName)
    const key = []
    if (processId) {
      key.push("logs_by_process")
      key.push(processId)
    } else {
      key.push("logs_by_time")
    }
    let selector: {
      prefix: Deno.KvKey
    } | {
      start: Deno.KvKey
      end: Deno.KvKey
    }
    if (startTimeStamp || endTimeStamp) {
      const startKey: (string | number)[] = [...key]
      startKey.push(startTimeStamp || 0)
      const endKey: (string | number)[] = [...key]
      endKey.push(endTimeStamp || Infinity)
      selector = {
        start: startKey,
        end: endKey,
      }
    } else if (!startTimeStamp && !endTimeStamp) {
      selector = { prefix: key }
    } else {
      throw new Error("Invalid combination of arguments for getLogContent")
    }
    const result = await store.list(selector)
    const resultArray: LogEventData[] = []
    for await (const res of result) resultArray.push(res.value as LogEventData)
    if (nRows) {
      let spliceNumber = resultArray.length - nRows
      spliceNumber = spliceNumber < 0 ? 0 : spliceNumber
      resultArray.splice(0, spliceNumber)
    }
    store.close()
    return resultArray
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
    // Default initiator to
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
          text,
          processId: initiator,
          timeStamp,
        }
        const store = await Deno.openKv(this.storeName)
        await store.set(["logs_by_time", timeStamp], logObj)
        await store.set(["logs_by_process", initiator, timeStamp], logObj)
        store.close()
      } catch (error) {
        console.error(`Failed to write log to store '${this.storeName}' due to '${error.message}'. The following message was not logged: ${text}.`)
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
    text = stripColor(text)
    try {
      await Deno.writeTextFile(fileName, `${text}\n`, { append: true })
    } catch (_e) {
      if (!quiet) console.error(`Failed to write log '${fileName}'. The following message were not logged: ${text}.`)
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
      const store = await Deno.openKv(this.storeName)
      const now = Date.now()
      const startTime = now - keepHours * 60 * 60 * 1000
      const logsByTimeSelector = {
        prefix: ["logs_by_time"],
        end: ["logs_by_time", startTime],
      }
      let rowsDeleted = 0
      for await (const entry of store.list(logsByTimeSelector)) {
        await store.delete(entry.key)
        rowsDeleted++
      }
      store.close()
      return rowsDeleted
    } catch (error) {
      this.log("error", `Failed to purge logs from store '${this.storeName}': ${error.message}`)
      return 0
    }
  }
}

export { Logger }

export type { AttachedLogger }
