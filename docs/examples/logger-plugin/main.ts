import { LogEvent, PluginConfiguration, PluginMetadata, PluginApi } from "../../../mod.ts"

export class PupPlugin {

  public meta: PluginMetadata = {
    name: "Demo logger plugin",
    version: "0.0.1",
    repository: "https://github.com/Hexagon/pup/tree/main/docs/examples/logger-plugin",
  }

  private api: PluginApi
  private config: PluginConfiguration

  constructor(pup: PluginApi, config: PluginConfiguration) {
    this.api = pup
    this.config = config
  }

  public hook(hook: string, parameters: unknown): boolean {
    if (hook === "log") {
      const p: LogEvent = parameters as LogEvent
      // This output the logs in a more simple way than default
      console.log(p.severity, p.category, p.text)
      // Return true to block normal operation this is the logger hook
      return true
    }
    // Return false if this was any hook other than logger
    return false
  }

}
