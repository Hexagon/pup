/**
 * Main entrypoint of the Pup plugin 'web-interface'
 *
 * @file plugins/web-interface/mod.ts
 */

// deno-lint-ignore-file no-explicit-any

import { ProcessStateChangedEvent } from "../../lib/core/process.ts"
import { LogEvent, PluginApi, PluginConfiguration, PluginImplementation } from "../../mod.ts"
import { Application, Bundlee, dirname, Router } from "./deps.ts"

interface Configuration {
  port: number
}

interface LogInventoryEntry {
  ts: Date
  id?: string
  severity: string
  category: string
  text: string
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
  private logs: Map<string, Array<LogInventoryEntry>>
  private staticFiles?: Record<string, string>

  constructor(pup: PluginApi, config: PluginConfiguration) {
    super(pup, config)

    this.pup = pup
    this.config = config.options as Configuration
    this.app = new Application()
    this.router = new Router()

    // Store and validate plugin configuration
    if (!(this.config.port > 1 && this.config.port < 65535)) {
      throw new Error("Invalid port number")
    }

    this.setupRoutes()
    this.startServer()

    this.logs = new Map<string, Array<LogInventoryEntry>>()

    this.pup.events.on("log", (d?: LogEvent) => {
      if (d) {
        const logRow: LogInventoryEntry = {
          ts: new Date(),
          id: d.process?.id,
          category: d.category,
          severity: d.severity,
          text: d.text,
        }
        const process = d.process?.id || "__core"
        if (!this.logs.has(process)) {
          this.logs.set(process, [logRow])
        } else {
          const arr = this.logs.get(process) || []
          arr?.push(logRow)
          this.logs.set(process, arr)
        }
      }
    })
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

    // Set up endpoint to serve process data
    this.router.get("/logs/:id", (context: any) => {
      const id = context.params.id
      context.response.body = JSON.stringify(this.logs.get(id))
    })

    // Set up endpoint to redirect / to /web-interface.html
    this.router.get("/", (context: any) => {
      context.response.redirect("/web-interface.html")
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
        next()
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
    await this.app.listen({ port: this.config.port })
  }

  private handleWebSocketConnection(ws: WebSocket) {
    const logStreamer = (d?: LogEvent) => {
      if (d) {
        const logRow: LogInventoryEntry = {
          ts: new Date(),
          id: d.process?.id,
          category: d.category,
          severity: d.severity,
          text: d.text,
        }
        ws.send(JSON.stringify({
          type: "log",
          data: logRow,
        }))
      }
    }
    const ProcessStateStreamer = (d?: ProcessStateChangedEvent) => {
      ws.send(JSON.stringify({
        type: "process_status_changed",
        data: d,
      }))
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
}
