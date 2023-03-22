/**
 * Main entrypoint of the Pup plugin 'splunk-hec'
 *
 * @file plugins/splunk-hec/mod.ts
 */

import { PluginApi, PluginConfiguration, PluginImplementation } from "../../mod.ts"
import { HECClient } from "./hec.ts"

export class SplunkReporterPlugin extends PluginImplementation {
  private hecClient: HECClient

  constructor(private pup: PluginApi, private config: PluginConfiguration) {
    super(pup, config)
    this.meta = {
      name: "SplunkReporterPlugin",
      version: "1.0.0",
      api: "1",
      repository: "https://github.com/hexagon/pup",
    }

    const { hecUrl, hecToken } = this.config.options as {
      hecUrl: string
      hecToken: string
    }

    this.hecClient = new HECClient(hecUrl, hecToken)

    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.pup.events.on("process_status_changed", async (eventData) => {
      await this.hecClient.sendEvent({
        sourcetype: "pup:process_status_changed",
        event: eventData,
      })
    })
    this.pup.events.on("log", async (eventData) => {
      await this.hecClient.sendEvent({
        sourcetype: "pup:log",
        event: eventData,
      })
    })
    this.pup.events.on("ipc", async (eventData) => {
      await this.hecClient.sendEvent({
        sourcetype: "pup:ipc",
        event: eventData,
      })
    })
  }
}
