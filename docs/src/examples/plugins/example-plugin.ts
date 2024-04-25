import { PupRestClient } from "jsr:@pup/api-client"
import { type PluginConfiguration, PluginImplementation } from "jsr:@pup/plugin"
import type { ApiApplicationState } from "jsr:@pup/api-definitions"

// Set up the expected configuration
interface Configuration {
  threshold: string
}

// The main entrypoint of a Plugin is an exported class named PupPlugin
// which should always extend PluginImplementation
export class PupPlugin extends PluginImplementation {
  public meta = {
    name: "ExamplePlugin",
    version: "1.0.0",
    api: "1.0.0",
    repository: "https://github.com/user/my-repo",
  }

  private config: Configuration

  private client: PupRestClient

  constructor(
    config: PluginConfiguration,
    apiUrl: string,
    apiToken: string,
  ) {
    super(config, apiUrl, apiToken)
    this.config = config.options as Configuration

    // Set up the rest client
    // - api url and a token is supplied by Pup
    this.client = new PupRestClient(
      `http://${apiUrl}`,
      apiToken,
      true,
    )

    // Get threshold from config
    const threshold = parseInt(this.config.threshold, 10)

    // Send a little hello
    this.sendLog("info", `Example plugin is initiated, memory usage threshold is set to ${threshold}%.`)

    // Listen for log messages from the API
    this.client.on("application_state", (pupState: unknown) => {
      const tPupState = pupState as ApiApplicationState
      const memoryUsage = Math.round(tPupState.systemMemory.free / tPupState.systemMemory.total * 100)
      if (memoryUsage > threshold) {
        this.sendLog("error", `Memory usage is critically high (${memoryUsage}%)...`)
      } else {
        this.sendLog("info", `Memory usage is fine (${memoryUsage}%)...`)
      }
    })
  }

  // Helper function to send logs via the Rest API
  public async sendLog(severity: string, message: string) {
    // Wrap all API calls in try/catch
    try {
      await this.client.sendLog(
        severity,
        "example-plugin",
        message,
      )
    } catch (_e) { /* Could not send log */ }
  }

  // Keep things tidy
  public async cleanup(): Promise<boolean> {
    this.client.close()
    return await true
  }
}
