import { type LogEvent, type PluginApi, type PluginConfiguration, PluginImplementation } from "../../../mod.ts"

export class PupPlugin extends PluginImplementation {
  constructor(pup: PluginApi, config: PluginConfiguration) {
    super(pup, config)
    this.meta = {
      name: "LoggerInterceptorPlugin",
      version: "1.0.0",
      api: "1",
      repository: "https://github.com/hexagon/pup",
    }
  }

  public hook(signal: string, parameters: unknown): boolean {
    if (signal === "log") {
      this.handleLog(parameters as LogEvent)
      // Block further processing by other log plugins, or built in logger
      return true
    }
    return false
  }

  private handleLog(p: LogEvent) {
    console.log(p.severity, p.category, p.text)
  }
}
