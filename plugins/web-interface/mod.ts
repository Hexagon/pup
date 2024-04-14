/**
 * Main entrypoint of the Pup plugin 'web-interface'
 *
 * @file plugins/web-interface/mod.ts
 */

// deno-lint-ignore-file no-explicit-any

import type { ProcessStateChangedEvent } from "../../lib/core/process.ts"
import { type LogEvent, type PluginApi, type PluginConfiguration, PluginImplementation } from "../../mod.ts"
import { Application, Bundlee, dirname, Router } from "./deps.ts"

interface Configuration {
  port: number
}

export interface LogEventData {
  severity: string
  category: string
  text: string
  processId: string
  timeStamp: number
}

export class PupPlugin extends PluginImplementation {
  public meta = {
    name: "WebInterfacePlugin",
    version: "1.0.0",
    api: "1",
    repository: "https://github.com/hexagon/",
  }

  private pup: PluginApi
  private config: Configuration
  private app: Application
  private router: Router
  private controller: AbortController

  constructor(pup: PluginApi, config: PluginConfiguration) {
    super(pup, config)

    this.pup = pup
    this.config = config.options as Configuration
    this.app = new Application()
    this.router = new Router()
    this.controller = new AbortController()

    // Store and validate plugin configuration
    if (!(this.config.port > 1 && this.config.port < 65535)) {
      throw new Error("Invalid port number")
    }

    this.setupRoutes()
    this.startServer()
  }

  private setupRoutes() {
    // Set up WebSocket route
    this.router.get("/ws", async (context: any) => {
      if (!context.isUpgradable) {
        context.throw(501)
      }
      const ws = await context.upgrade()
      this.handleWebSocketConnection(ws)
    })

    // Set up endpoint to serve process data
    this.router.get("/processes", (context: any) => {
      const ProcessStatees = this.pup.allProcessStates()
      context.response.body = ProcessStatees
    })

    // Set up endpoint to serve main process information
    this.router.get("/state", (context: any) => {
      const ProcessStatees = this.pup.applicationState()
      context.response.body = ProcessStatees
    })

    this.router.get("/start/:id", (context: any) => {
      try {
        context.response.body = JSON.stringify({
          success: this.pup.start(context.params.id, "web-interface"),
        })
      } catch (_e) {
        context.response.code = 500
        context.response.body = JSON.stringify({ success: false })
      }
    })
    this.router.get("/stop/:id", (context: any) => {
      try {
        context.response.body = JSON.stringify({
          success: this.pup.stop(context.params.id, "web-interface"),
        })
      } catch (_e) {
        context.response.code = 500
        context.response.body = JSON.stringify({ success: false })
      }
    })
    this.router.get("/restart/:id", (context: any) => {
      try {
        context.response.body = JSON.stringify({
          success: this.pup.restart(context.params.id, "web-interface"),
        })
      } catch (_e) {
        context.response.code = 500
        context.response.body = JSON.stringify({ success: false })
      }
    })
    this.router.get("/block/:id", (context: any) => {
      try {
        context.response.body = JSON.stringify({
          success: this.pup.block(context.params.id, "web-interface"),
        })
      } catch (_e) {
        context.response.code = 500
        context.response.body = JSON.stringify({ success: false })
      }
    })
    this.router.get("/unblock/:id", (context: any) => {
      try {
        context.response.body = JSON.stringify({
          success: this.pup.unblock(context.params.id, "web-interface"),
        })
      } catch (_e) {
        context.response.code = 500
        context.response.body = JSON.stringify({ success: false })
      }
    })

    // Set up endpoint to redirect / to /web-interface.html
    this.router.get("/", (context: any) => {
      context.response.redirect("/web-interface.html")
    })

    this.router.get("/logs", async (context: any) => {
      try {
        const params = context.request.url.searchParams

        const processId = params.get("processId")
        const startTimeStamp = params.get("startTimeStamp")
        const endTimeStamp = params.get("endTimeStamp")
        const severity = params.get("severity")
        let nRows = params.get("nRows")

        // Convert nRows to integer and validate
        if (nRows) {
          nRows = parseInt(nRows, 10)
          if (isNaN(nRows)) {
            context.response.status = 400
            context.response.body = { error: "nRows should be a number" }
            return
          }
        }

        const nRowsCapped = (!nRows || nRows > 100) ? 100 : nRows

        let logContents = await this.pup.getLogs(processId, startTimeStamp, endTimeStamp, nRowsCapped)

        if (severity) {
          const severityLower = severity.toLowerCase()
          logContents = logContents.filter((log) => log.severity.toLowerCase() === severityLower)
        }

        context.response.body = logContents
      } catch (error) {
        context.response.status = 500
        context.response.body = { error: "Internal Server Error", message: error.message }
      }
    })

    // Set up route to serve static files using Bundlee
    this.app.use(async (context: any, next: any) => {
      const staticFiles = await Bundlee.load(dirname(import.meta.url) + "/static/bundle.json", "import")
      const url = "static" + context.request.url.pathname
      if (staticFiles.has(url)) {
        const fileData = await staticFiles.get(url)
        context.response.headers.set("Content-Type", fileData.contentType)
        context.response.body = fileData.content
      } else {
        await next()
      }
    })

    this.app.use(this.router.routes())
    this.app.use(this.router.allowedMethods())
  }

  private async startServer() {
    this.pup.log(
      "info",
      "web-interface",
      `Listening on http://localhost:${this.config.port}`,
    )
    await this.app.listen({ port: this.config.port, signal: this.controller.signal })
  }

  private handleWebSocketConnection(ws: WebSocket) {
    const logStreamer = (d?: LogEvent) => {
      if (d) {
        const logRow: LogEventData = {
          timeStamp: new Date().getTime(),
          processId: d.process?.id || "core",
          category: d.category,
          severity: d.severity,
          text: d.text,
        }
        try {
          ws.send(JSON.stringify({
            type: "log",
            data: logRow,
          }))
        } catch (_e) {
          // Do not log, this will cause an infinite loop
          /*this.pup.log(
            "error",
            "web-interface",
            `ProcessStateStreamer: Error sending log update`,
          )*/
          console.error("ProcessStateStreamer: Error sending log update (not logged)")
        }
      }
    }
    const ProcessStateStreamer = (d?: ProcessStateChangedEvent) => {
      try {
        ws.send(JSON.stringify({
          type: "process_status_changed",
          data: d,
        }))
      } catch (_e) {
        this.pup.log(
          "error",
          "web-interface",
          `ProcessStateStreamer: Error sending process status update`,
        )
      }
    }
    ws.onopen = () => {
      this.pup.events.on("log", logStreamer)
      this.pup.events.on("process_status_changed", ProcessStateStreamer)
    }
    ws.onclose = () => {
      this.pup.events.off("log", logStreamer)
      this.pup.events.off("process_status_changed", ProcessStateStreamer)
    }
  }

  public async cleanup(): Promise<boolean> {
    this.controller.abort()
    return await true
  }
}
