import { Application, Context, Router, Status } from "@oak/oak"
import { PupApi } from "./api.ts"
import { Pup } from "./pup.ts"
import { generateKey, JWTPayload } from "@cross/jwt"
import { DEFAULT_REST_API_HOSTNAME, DEFAULT_SECRET_KEY_ALGORITHM } from "./configuration.ts"
import { ValidateToken } from "../common/token.ts"

const generateAuthMiddleware = (key: CryptoKey, revoked?: string[]) => {
  return async (ctx: Context, next: () => Promise<unknown>) => {
    const headers: Headers = ctx.request.headers
    const authorization = headers.get("Authorization")
    if (!authorization) {
      ctx.response.status = Status.Unauthorized
      ctx.response.body = { message: "Authorization header required" }
      return
    }
    const parts = authorization.split(" ")
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      ctx.response.status = Status.Unauthorized
      ctx.response.body = { message: "Invalid authorization format" }
      return
    }
    const token = parts[1]
    try {
      const payload: JWTPayload = await ValidateToken(token, key) as JWTPayload
      if (payload) {
        if (payload.data?.consumer) {
          if (revoked && revoked.find((r) => r.toLowerCase().trim() === payload.data?.consumer.toLowerCase().trim())) {
            ctx.response.status = Status.Unauthorized
            ctx.response.body = { message: "Invalid token" }
          } else {
            await next()
          }
        } else {
          ctx.response.status = Status.Unauthorized
          ctx.response.body = { message: "Invalid token" }
        }
      } else {
        ctx.response.status = Status.Unauthorized
        ctx.response.body = { message: "Invalid/expired token" }
      }
    } catch (_err) {
      ctx.response.status = Status.Unauthorized
      ctx.response.body = { message: "Invalid token" }
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
    this.router.get("/wss", (ctx) => {
      if (!ctx.isUpgradable) {
        ctx.throw(501)
      }
      const ws = ctx.upgrade()
      if (!ctx.isUpgradable) {
        ctx.throw(501)
      }
      const proxyFn = (d: unknown) => {
        ws.send(JSON.stringify({ t: "log", d: d }))
      }
      this.pupApi.events.on("log", proxyFn)
      /*ws.onopen = () => {
        ws.send("Hello from server!")
      }*/
      ws.onmessage = (m) => {
        ws.send(m.data as string)
      }
      ws.onclose = (_e) => {
        this.pupApi.events.off("log", proxyFn)
      }
    })

    // Process related routes
    this.router
      .get("/processes", (ctx) => {
        ctx.response.body = this.pupApi.allProcessStates()
      })
      .get("/state", (ctx) => {
        ctx.response.body = this.pupApi.applicationState()
      })
      .post("/processes/:id/start", (ctx) => {
        const id = ctx.params.id
        try {
          this.pupApi.start(id, "REST API request")
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err.message }
        }
      })
      .post("/processes/:id/stop", (ctx) => {
        const id = ctx.params.id
        try {
          this.pupApi.stop(id, "REST API request")
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err.message }
        }
      })
      .post("/processes/:id/restart", (ctx) => {
        const id = ctx.params.id
        try {
          this.pupApi.restart(id, "REST API request")
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err.message }
        }
      })
      .post("/processes/:id/block", (ctx) => {
        const id = ctx.params.id
        try {
          this.pupApi.block(id, "REST API request")
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err.message }
        }
      })
      .post("/processes/:id/unblock", (ctx) => {
        const id = ctx.params.id
        try {
          this.pupApi.unblock(id, "REST API request")
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
        // Add logic to read forceQuitMs from the request body if needed
        const forceQuitMs = 3000 // Example value
        try {
          ctx.response.status = Status.OK
        } catch (err) {
          ctx.response.status = Status.InternalServerError
          ctx.response.body = { error: err.message }
        }
        this.pupApi.terminate(forceQuitMs)
      })
      /*.post("/log", async (ctx) => {
        // Read severity, plugin, and message from request body
        const body = await ctx.request.body().value
        this.pupApi.log(body.severity, body.plugin, body.message)
        ctx.response.status = Status.Created
      })*/
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

          let logContents = await this.pupApi.getLogs(processId || undefined, startTimeStamp, endTimeStamp, nRowsCapped)

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
  }

  public async start(): Promise<number> {
    const port = this.port
    this.app.use(generateAuthMiddleware(await this.setupKey(), this.pupApi.getConfiguration().api?.revoked))
    this.app.use(this.router.routes())
    this.app.use(this.router.allowedMethods())
    this.pupApi.log("info", "rest", `Starting the Rest API on ${this.hostname}:${this.port}`)
    await this.app.listen({ port, hostname: this.hostname, signal: this.appAbortController.signal })
    this.pupApi.log("info", "rest", `Rest API listening on port ${this.port}`)
    return port
  }

  public terminate() {
    this.appAbortController.abort()
  }
}
