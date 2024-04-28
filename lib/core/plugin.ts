import { PluginConfiguration, PluginImplementation } from "@pup/plugin"

/**
 * Internal representation of a plugin
 * - Used by @pup/pup internally!
 */
export class Plugin {
  private config: PluginConfiguration
  private apiUrl: string
  private apiToken: string
  public impl?: PluginImplementation
  constructor(config: PluginConfiguration, apiUrl: string, apiToken: string) {
    this.config = config
    this.apiUrl = apiUrl
    this.apiToken = apiToken
  }
  /**
   * Will throw on any error
   */
  public async load() {
    const { PupPlugin } = await import(this.config.url)
    this.impl = new PupPlugin(this.config, this.apiUrl, this.apiToken) as PluginImplementation
  }
  public verify() {
    if (!this.impl || this.impl.meta.name === "unset") {
      throw new Error("Plugin missing meta.name")
    }
    if (!this.impl || this.impl.meta.repository === "unset") {
      throw new Error("Plugin missing meta.repository")
    }
    if (!this.impl || this.impl.meta.version === "unset") {
      throw new Error("Plugin missing meta.version")
    }
    if (!this.impl || this.impl.meta.api === "unset") {
      throw new Error("Plugin missing meta.api")
    }
  }
  async refreshToken(token: string): Promise<void> {
    this.apiToken = token
    await this.impl?.refreshApiToken(token)
  }
  getToken(): string {
    return this.apiToken
  }
  async terminate() {
    if (this.impl?.cleanup) await this.impl?.cleanup()
  }
}
