/**
 * Main entrypoint of the Pup plugin 'web-interface'
 *
 * @file plugins/web-interface/mod.ts
 */

// deno-lint-ignore-file no-explicit-any

import { ProcessStatus, ProcessStatusChangedEvent } from "../../lib/core/process.ts"
import { LogEvent, PluginApi, PluginConfiguration, PluginImplementation } from "../../mod.ts"

import { Application, dirname, fromFileUrl, Router } from "./deps.ts"

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
      const processStatuses = this.pup.allProcessStatuses()
      context.response.body = processStatuses
    })
    // Set up endpoint to serve process data
    this.router.get("/logs/:id", (context: any) => {
      const id = context.params.id
      context.response.body = JSON.stringify(this.logs.get(id))
    })
    // Set up route to serve static files (e.g., HTML, CSS, JS)
    this.app.use(async (context: any, next: any) => {
      const basePath = dirname(fromFileUrl(import.meta.url))
      try {
        await context.send({
          root: `${basePath}/static`,
          index: "web-interface.html",
        })
      } catch {
        await next()
      }
    })

    this.app.use(this.router.routes())
    this.app.use(this.router.allowedMethods())
  }

  private async startServer() {
    console.log(`Web interface listening on http://localhost:${this.config.port}`)
    await this.app.listen({ port: this.config.port })
  }

  private handleWebSocketConnection(ws: WebSocket) {
    const logStreamer = (d?: LogEvent) => {
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
    const processStatusStreamer = (d?: ProcessStatusChangedEvent) => {
      ws.send(JSON.stringify({
        type: "process_status_changed",
        data: d,
      }))
    }
    ws.onopen = () => {
      this.pup.events.on("log", logStreamer)
      this.pup.events.on("process_status_changed", processStatusStreamer)
    }
    ws.onclose = () => {
      this.pup.events.off("log", logStreamer)
      this.pup.events.off("process_status_changed", processStatusStreamer)
    }
  }
}
