/**
 * Guidelines:
 * - All routes should be wrapped in try/catch
 * - All communication with Pup should go through the programmatic api (PupApi)
 */

import { Application, Context, Router, Status } from "@oak/oak"
import { PupApi } from "./api.ts"
import { Pup } from "./pup.ts"
import { generateKey, JWTPayload } from "@cross/jwt"
import { DEFAULT_REST_API_HOSTNAME, DEFAULT_SECRET_KEY_ALGORITHM } from "./configuration.ts"
import { ValidateToken } from "../common/token.ts"
import { EventHandler } from "@pup/common/eventemitter"
import { ApiIpcData } from "@pup/api-definitions"

const ALLOWED_SEVERITIES = ["log", "info", "warn", "error"]
const EVENTS_TO_PROPAGATE = [
  "log",
  "process_status_changed",
  "process_scheduled",
  "process_scheduled_terminate",
  "process_watch",
  "init",
  "process_telemetry",
  "watchdog",
  "application_state",
  "terminating",
  "ipc",
]
export interface ApiResponseBody {
  error?: string
  data?: unknown
}

function isAllowedSeverity(severity: string): boolean {
  return ALLOWED_SEVERITIES.includes(severity.toLowerCase())
}

const generateAuthMiddleware = (key: CryptoKey, revoked?: string[]) => {
  return async (ctx: Context, next: () => Promise<unknown>) => {
    const headers: Headers = ctx.request.headers
    const authorization = headers.get("Authorization")
    if (!authorization) {
      ctx.response.status = Status.Unauthorized
      ctx.response.body = { error: "Authorization header required" }
      return
    }
    const parts = authorization.split(" ")
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      ctx.response.status = Status.Unauthorized
      ctx.response.body = { error: "Invalid authorization format" }
      return
    }
    const token = parts[1]
    try {
      const payload: JWTPayload = await ValidateToken(token, key) as JWTPayload
      if (payload) {
        if (payload.data?.consumer) {
          if (revoked && revoked.find((r) => r.toLowerCase().trim() === payload.data?.consumer.toLowerCase().trim())) {
            ctx.response.status = Status.Unauthorized
            ctx.response.body = { error: "Revoked token" }
          } else {
            ctx.state.consumer = payload.data?.consumer
            await next()
          }
        } else {
          ctx.response.status = Status.Unauthorized
          ctx.response.body = { error: "Token missing consumer" }
        }
      } else {
        ctx.response.status = Status.Unauthorized
        ctx.response.body = { error: "Invalid/expired token" }
      }
    } catch (_err) {
      ctx.response.status = Status.Unauthorized
      ctx.response.body = { error: "Invalid token" }
    }
  }
}

export class RestApi {
  private pupApi: PupApi
  private app: Application
  private router: Router
  private appAbortController: AbortController

  private secret: string

  public port: number
  public hostname: string

  constructor(pup: Pup, hostname: string | undefined, port: number, jwtSecret: string) { // Takes a Pup instance
    this.pupApi = new PupApi(pup)
    this.app = new Application()
    this.router = new Router()
    this.appAbortController = new AbortController()
    this.port = port
    this.hostname = hostname || DEFAULT_REST_API_HOSTNAME
    this.secret = jwtSecret
    this.setupRoutes() // Setup routes within the constructor
  }

  private async setupKey() {
    return await generateKey(this.secret, DEFAULT_SECRET_KEY_ALGORITHM)
  }

  private setupRoutes() {
    // New websocket connection
    this.router.get("/wss", (ctx) => {
      // Upgrade
      if (!ctx.isUpgradable) {
        return ctx.throw(501)
      }
      try {
        const ws = ctx.upgrade()
        if (!ctx.isUpgradable) {
          return ctx.throw(501)
        }

        // Expose events to the API Consumer
        const proxyFns: Record<string, string | EventHandler<unknown>>[] = []
        const proxyFnFactory = (evtName: string) => {
          const proxyFn = (d: unknown) => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ t: evtName, d: d }))
              } catch (_e) { /* Silently ignore errors */ }
            }
          }
          proxyFns.push({ evtName, proxyFn })
          return proxyFn
        }
        for (const evtName of EVENTS_TO_PROPAGATE) {
          this.pupApi.events.on(evtName, proxyFnFactory(evtName))
        }
        ws.onclose = () => {
          for (const evt of proxyFns) {
            this.pupApi.events.off(evt.evtName as string, evt.proxyFn as EventHandler<unknown>)
          }
        }
      } catch (_e) {
        return ctx.throw(500)
      }
    })

    // Process related routes
    this.router
      .get("/processes", (ctx) => {
        try {
          ctx.response.body = {
            data: this.pupApi.allProcessStates(),
          }
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
        }
      })
      .get("/state", (ctx) => {
        try {
          ctx.response.body = {
            data: this.pupApi.applicationState(),
          }
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
        }
      })
      .post("/processes/:id/start", (ctx) => {
        const id = ctx.params.id
        try {
          if (this.pupApi.start(id, "REST API request")) {
            ctx.response.status = Status.OK
          } else {
            ctx.response.status = Status.InternalServerError
            ctx.response.body = { error: "Action could not be carried out, check the arguments." }
          }
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
        }
      })
      .post("/processes/:id/stop", async (ctx) => {
        const id = ctx.params.id
        try {
          if (await this.pupApi.stop(id, "REST API request")) {
            ctx.response.status = Status.OK
          } else {
            ctx.response.status = Status.InternalServerError
            ctx.response.body = { error: "Action could not be carried out, check the arguments." }
          }
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
        }
      })
      .post("/processes/:id/restart", (ctx) => {
        const id = ctx.params.id
        try {
          if (this.pupApi.restart(id, "REST API request")) {
            ctx.response.status = Status.OK
          } else {
            ctx.response.status = Status.InternalServerError
            ctx.response.body = { error: "Action could not be carried out, check the arguments." }
          }
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
        }
      })
      .post("/processes/:id/block", (ctx) => {
        const id = ctx.params.id
        try {
          if (this.pupApi.block(id, "REST API request")) {
            ctx.response.status = Status.OK
          } else {
            ctx.response.status = Status.InternalServerError
            ctx.response.body = { error: "Action could not be carried out, check the arguments." }
          }
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
        }
      })
      .post("/processes/:id/unblock", (ctx) => {
        const id = ctx.params.id
        try {
          if (this.pupApi.unblock(id, "REST API request")) {
            ctx.response.status = Status.OK
          } else {
            ctx.response.status = Status.InternalServerError
            ctx.response.body = { error: "Action could not be carried out, check the arguments." }
          }
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
        }
      })
      .post("/telemetry", async (ctx) => {
        if (ctx.request.hasBody) {
          try {
            const parsedBody = await ctx.request.body.json()
            const success = this.pupApi.telemetry(parsedBody)
            if (success) {
              ctx.response.status = Status.OK
            } else {
              ctx.response.status = Status.InternalServerError
              ctx.response.body = { error: "Invalid data" }
            }
          } catch (err) {
            ctx.response.status = Status.InternalServerError
            ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
          }
        }
      })
      .post("/ipc", async (ctx) => {
        if (ctx.request.hasBody) {
          try {
            const parsedBody: ApiIpcData = await ctx.request.body.json()
            if (!parsedBody.target) {
              ctx.response.status = Status.InternalServerError
              return ctx.response.body = { error: "Missing target" }
            } else if (!parsedBody.event) {
              ctx.response.status = Status.InternalServerError
              return ctx.response.body = { error: "Missing event" }
            } else if (!parsedBody.eventData) {
              ctx.response.status = Status.InternalServerError
              return ctx.response.body = { error: "Missing event data" }
            } else {
              // Append sender
              parsedBody.sender = ctx.state.consumer
              const success = this.pupApi.ipc(parsedBody)
              if (success) {
                ctx.response.status = Status.OK
              } else {
                ctx.response.status = Status.InternalServerError
                ctx.response.body = { error: "Invalid data" }
              }
            }
          } catch (err) {
            ctx.response.status = Status.InternalServerError
            ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
          }
        }
      })
      .post("/terminate", (ctx) => {
        try {
          this.pupApi.terminate(30000)
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
        }
      })
      .post("/log", async (ctx) => {
        try {
          // Read severity, plugin, and message from request body
          const parsedBody = await ctx.request.body.json()
          if (!parsedBody) {
            ctx.response.status = Status.BadRequest
            ctx.response.body = { error: "Log data is required." }
            return
          }

          if (!parsedBody.severity || !parsedBody.plugin || !parsedBody.message) {
            ctx.response.status = Status.BadRequest
            ctx.response.body = { error: "Missing severity, plugin, or message." }
            return
          }

          if (!isAllowedSeverity(parsedBody.severity)) {
            ctx.response.status = Status.BadRequest
            ctx.response.body = { error: "Invalid severity." }
            return
          }

          this.pupApi.log(
            parsedBody.severity,
            parsedBody.plugin,
            parsedBody.message,
          )
          ctx.response.status = Status.Created
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err instanceof Error ? err.message : "Unknown" }
        }
      })
      .get("/logs", async (context) => {
        try {
          const params = context.request.url.searchParams

          const processId = params.get("processId")
          const startTimeStampParam = params.get("startTimeStamp")
          const endTimeStampParam = params.get("endTimeStamp")
          const severity = params.get("severity")
          const nRowsParam = params.get("nRows")

          // Convert nRows to integer and validate
          let nRows
          if (nRowsParam) {
            nRows = parseInt(nRowsParam, 10)
            if (isNaN(nRows)) {
              context.response.status = 400
              context.response.body = { error: "nRows should be a number" }
              return
            }
          }
          let startTimeStamp
          if (startTimeStampParam) {
            startTimeStamp = parseInt(startTimeStampParam, 10)
            if (isNaN(startTimeStamp)) {
              context.response.status = 400
              context.response.body = { error: "startTimeStamp should be a number" }
              return
            }
          }
          let endTimeStamp
          if (endTimeStampParam) {
            endTimeStamp = parseInt(endTimeStampParam, 10)
            if (isNaN(endTimeStamp)) {
              context.response.status = 400
              context.response.body = { error: "endTimeStamp should be a number" }
              return
            }
          }
          const nRowsCapped = (!nRows || (nRows && nRows > 100)) ? 100 : nRows

          let logContents = await this.pupApi.getLogs(
            processId || undefined,
            startTimeStamp,
            endTimeStamp,
            nRowsCapped,
          )

          if (severity) {
            const severityLower = severity.toLowerCase()
            logContents = logContents.filter((log) => log.severity.toLowerCase() === severityLower)
          }

          context.response.body = { data: logContents }
        } catch (error) {
          context.response.status = 500
          context.response.body = {
            error: "Internal Server Error",
            message: error instanceof Error ? error.message : "Unknown",
          }
        }
      })
  }

  public async start(): Promise<number> {
    this.app.use(
      generateAuthMiddleware(
        await this.setupKey(),
        this.pupApi.getConfiguration().api?.revoked,
      ),
    )
    this.app.use(this.router.routes())
    this.app.use(this.router.allowedMethods())
    this.pupApi.log("info", "rest", `Starting the Rest API on ${this.hostname}:${this.port}`)
    await this.app.listen({
      port: this.port,
      hostname: this.hostname,
      signal: this.appAbortController.signal,
    })
    return this.port
  }

  public terminate() {
    this.appAbortController.abort()
  }
}
