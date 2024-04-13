/**
 * Main entrypoint of the Pup plugin 'splunk-hec'
 *
 * @file plugins/splunk-hec/mod.ts
 */

import { type PluginApi, type PluginConfiguration, PluginImplementation } from "../../mod.ts"
import { HECClient } from "./hec.ts"

export class PupPlugin extends PluginImplementation {
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

    const url = hecUrl || Deno.env.get("PUP_SPLUNK_HEC_URL") || ""
    const token = hecToken || Deno.env.get("PUP_SPLUNK_HEC_TOKEN") || ""

    this.hecClient = new HECClient(url, token)

    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.pup.events.on("process_status_changed", async (eventData) => {
      try {
        await this.hecClient.sendEvent({
          sourcetype: "pup:process_status_changed",
          event: eventData,
        })
      } catch (error) {
        this.pup.log("error", "splunk-hec", `Failed to send process_status_changed log to Splunk HEC: ${error}`)
      }
    })
    this.pup.events.on("log", async (eventData) => {
      // Avoid infinite loops
      if ((eventData as Record<string, string>)["category"] === "plugin-splunk-hec") return

      try {
        await this.hecClient.sendEvent({
          sourcetype: "pup:log",
          event: eventData,
        })
      } catch (error) {
        this.pup.log("error", "splunk-hec", `Failed to send log to Splunk HEC: ${error}`)
      }
    })
    this.pup.events.on("ipc", async (eventData) => {
      try {
        await this.hecClient.sendEvent({
          sourcetype: "pup:ipc",
          event: eventData,
        })
      } catch (error) {
        this.pup.log("error", "splunk-hec", `Failed to send ipc log to Splunk HEC: ${error}`)
      }
    })
  }
}
