import { GlobalLoggerConfiguration, ProcessConfiguration } from "./configuration.ts"

class Logger {
  private process: ProcessConfiguration | undefined
  private config: GlobalLoggerConfiguration = {}
  constructor(globalConfiguration: GlobalLoggerConfiguration | undefined) {
    if (globalConfiguration) this.config = globalConfiguration
  }
  setProcess(processConfiguration: ProcessConfiguration) {
    this.process = processConfiguration
  }
  #internalLog(severity: string, category: string, text: string) {
    const initiator = this.process?.name || "core"

    // Log to console
    const logToConsoleProcess = (this.process?.logger?.console ?? true) === false
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
      this.#writeFile(stderrFileName, decorateGlobalFiles ? decoratedLogText : text)
    }
    if (!isStdErr && this.config.stdout) {
      this.#writeFile(this.config.stdout, decorateGlobalFiles ? decoratedLogText : text)
    }

    // Write process log file(s)
    const decorateProcessFiles = this.process?.logger?.decorateFiles ?? false
    // If stderr is not defined but stdout is, use the stdout file
    const stderrProcessFileName = this.process?.logger?.stderr ?? this.process?.logger?.stdout
    if (isStdErr && stderrProcessFileName) {
      this.#writeFile(stderrProcessFileName, decorateProcessFiles ? decoratedLogText : text)
    }
    if (!isStdErr && this.process?.logger?.stdout) {
      this.#writeFile(this.process?.logger?.stdout, decorateProcessFiles ? decoratedLogText : text)
    }
  }
  async #writeFile(fileName: string, text: string) {
    try {
      await Deno.writeTextFile(fileName, `${text}\n`, { append: true })
    } catch (_e) {
      console.error(`Failed to write log '${fileName}'. The following message were not logged: ${text}.`)
    }
  }
  log(category: string, text: string) {
    this.#internalLog("log", category, text)
  }
  info(category: string, text: string) {
    this.#internalLog("info", category, text)
  }
  warn(category: string, text: string) {
    this.#internalLog("warn", category, text)
  }
  error(category: string, text: string) {
    this.#internalLog("error", category, text)
  }
}

export { Logger }
