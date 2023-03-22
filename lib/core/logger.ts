import { stripColor } from "../../deps.ts"
import { GlobalLoggerConfiguration, ProcessConfiguration } from "./configuration.ts"

export interface LogEvent {
  severity: string
  category: string
  text: string
  process?: ProcessConfiguration
}

type AttachedLogger = (severity: string, category: string, text: string, process?: ProcessConfiguration) => boolean

class Logger {
  private config: GlobalLoggerConfiguration = {}
  private attachedLogger?: AttachedLogger

  constructor(globalConfiguration: GlobalLoggerConfiguration) {
    this.config = globalConfiguration
  }

  // Used for attaching the logger hook
  public attach(pluginLogger: AttachedLogger) {
    this.attachedLogger = pluginLogger
  }

  private internalLog(severity: string, category: string, text: string, process?: ProcessConfiguration) {
    // Delegate to attached logger if there is one
    let blockedByAttachedLogger = false
    if (this.attachedLogger) {
      // Do not trust the attached logger
      try {
        blockedByAttachedLogger = this.attachedLogger(severity, category, text, process)
      } catch (e) {
        console.error("Error in attached logger: ", e)
      }
    }

    // Quit early if an attached logger request it
    if (blockedByAttachedLogger) return

    // Default initiator to
    const initiator = process?.id || "core"

    // Log to console
    const logToConsoleProcess = (process?.logger?.console ?? true) === false
    const logToConsoleGlobal = (this.config?.console ?? true) === false
    const logToConsole = !logToConsoleGlobal && !logToConsoleProcess
    const isStdErr = severity === "error" || category === "stderr"

    // Prepare decorated log text
    const decoratedLogText = `[${new Date().toLocaleString()}][${initiator}][${category}] ${text}`

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

  private async writeFile(fileName: string, text: string) {
    // Strip colors
    text = stripColor(text)
    try {
      await Deno.writeTextFile(fileName, `${text}\n`, { append: true })
    } catch (_e) {
      console.error(`Failed to write log '${fileName}'. The following message were not logged: ${text}.`)
    }
  }
  public log(category: string, text: string, process?: ProcessConfiguration) {
    this.internalLog("log", category, text, process)
  }
  public info(category: string, text: string, process?: ProcessConfiguration) {
    this.internalLog("info", category, text, process)
  }
  public warn(category: string, text: string, process?: ProcessConfiguration) {
    this.internalLog("warn", category, text, process)
  }
  public error(category: string, text: string, process?: ProcessConfiguration) {
    this.internalLog("error", category, text, process)
  }
}

export { Logger }

export type { AttachedLogger }
