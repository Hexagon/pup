// deno-lint-ignore-file no-explicit-any
/**
 * Main entrypoint of the Pup plugin 'web-interface'
 *
 * @file plugins/web-interface/mod.ts
 */

import { PluginApi, PluginConfiguration, PluginImplementation } from "../../mod.ts"

import { Application, dirname, fromFileUrl, isWebSocketCloseEvent, isWebSocketPingEvent, isWebSocketPongEvent, Router } from "./deps.ts"

interface Configuration {
  port: number
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
  }

  private setupRoutes() {
    // Set up WebSocket route
    this.router.get("/ws", async (context: any) => {
      if (context.isUpgradable) {
        const ws = await context.upgrade()
        this.handleWebSocketConnection(ws)
      }
    })

    // Set up endpoint to serve process data
    this.router.get("/processes", (context: any) => {
      const processStatuses = this.pup.allProcessStatuses()
      context.response.body = processStatuses
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

  private async handleWebSocketConnection(socket: WebSocket) {
    console.log("WebSocket connection established")

    for await (const event of socket) {
      if (isWebSocketCloseEvent(event) || isWebSocketPingEvent(event) || isWebSocketPongEvent(event)) {
        // Handle WebSocket close, ping, and pong events
        continue
      }

      // Handle WebSocket messages
      const message = typeof event === "string" ? JSON.parse(event) : event
      this.handleWebSocketMessage(socket, message)
    }
  }

  private async handleWebSocketMessage(socket: WebSocket, message: any) {
    if (message.type === "request_initial_data") {
      const processStatuses = this.pup.allProcessStatuses()
      await socket.send(JSON.stringify({
        type: "initial_data",
        data: processStatuses,
      }))
    }
  }
}
