import { LoggerPluginParams, PluginConfiguration, PluginImplementation, PluginMetadata, Pup } from "../../../mod.ts"

/**
 * Every plug in should extend PluginImplementation
 */
export class PupPlugin extends PluginImplementation {
  public meta: PluginMetadata = {
    name: "Demo logger plugin",
    version: "0.0.1",
    repository: "https://github.com/hexagon/pup",
  }
  constructor(pup: Pup, config: PluginConfiguration) {
    /**
     * This makes two variables exist in the instance
     * - this.pup - Main class of pup, here will most information be available
     * - this.config - The configuration of this plugin
     */
    super(pup, config)
  }
  public signal(signal: string, parameters: unknown): boolean {
    /**
     * signal can be one of logger | watchdog | init
     */
    if (signal === "logger") {
      const p: LoggerPluginParams = parameters as LoggerPluginParams

      /**
       * This console.log will replace the build in logger
       */
      console.log(p.severity, p.category, p.text)

      /**
       * Returning true will block normal operations,
       * in this case the built in logger wont log anything.
       */
      return true
    }

    return false
  }
}
