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

const ALLOWED_SEVERITIES = ["log", "info", "warn", "error"]

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
            ctx.response.body = { error: "Invalid token" }
          } else {
            await next()
          }
        } else {
          ctx.response.status = Status.Unauthorized
          ctx.response.body = { error: "Invalid token" }
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
        ctx.throw(501)
      }
      const ws = ctx.upgrade()
      if (!ctx.isUpgradable) {
        ctx.throw(501)
      }

      /*
      Handle incoming message
      ws.onmessage = (m) => {
        ws.send(m.data as string)
      }
      */

      // Expose events to the API Consumer
      const fnsToProxy = ["log", "process_status_changed"]
      const proxyFns: Record<string, string | EventHandler<unknown>>[] = []
      const proxyFnFactory = (evtName: string) => {
        const proxyFn = (d: unknown) => {
          ws.send(JSON.stringify({ t: evtName, d: d }))
        }
        proxyFns.push({ evtName, proxyFn })
        return proxyFn
      }
      for (const evtName of fnsToProxy) {
        this.pupApi.events.on(evtName, proxyFnFactory(evtName))
      }
      ws.onclose = () => {
        for (const evt of proxyFns) {
          this.pupApi.events.off(evt.evtName as string, evt.proxyFn as EventHandler<unknown>)
        }
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
          ctx.response.body = { error: err.message }
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
          ctx.response.body = { error: err.message }
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
          ctx.response.body = { error: err.message }
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
          ctx.response.body = { error: err.message }
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
          ctx.response.body = { error: err.message }
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
          ctx.response.body = { error: err.message }
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
          ctx.response.body = { error: err.message }
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
            ctx.response.body = { error: err.message }
          }
        }
      })
      .post("/terminate", (ctx) => {
        try {
          this.pupApi.terminate(30000)
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err.message }
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

          if (!parsedBody.severity || !parsedBody.consumer || !parsedBody.message) {
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
          ctx.response.body = { error: err.message }
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
            message: error.message,
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
    this.pupApi.log("info", "rest", `Starting the Rest API`)
    await this.app.listen({
      port: this.port,
      hostname: this.hostname,
      signal: this.appAbortController.signal,
    })
    this.pupApi.log(
      "info",
      "rest",
      `Rest API running, available on ${this.hostname}:${this.port}`,
    )
    return this.port
  }

  public terminate() {
    this.appAbortController.abort()
  }
}
