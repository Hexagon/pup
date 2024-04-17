import { Application, Context, Router, Status } from "@oak/oak"
import { PupApi } from "./api.ts"
import { Pup } from "./pup.ts"
import { generateKey, verifyJWT } from "@cross/jwt"

// Dummy secret for now
const jwtSecret = "GawoWOOWOOFSAFFASOFOFOASOAOFASFwoopieeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

const jwtKey = await generateKey(jwtSecret, "HS512")

const authMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
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
    const payload = await verifyJWT(token, jwtKey)
    ctx.state.user = payload.user // Add user info to context state
    await next() // Proceed if valid
  } catch (_err) {
    ctx.response.status = Status.Unauthorized
    ctx.response.body = { message: "Invalid token" }
  }
}

export class RestApi {
  private pupApi: PupApi
  private app: Application
  private router: Router
  private appAbortController: AbortController

  constructor(pup: Pup) { // Takes a Pup instance
    this.pupApi = new PupApi(pup)
    this.app = new Application()
    this.router = new Router()
    this.appAbortController = new AbortController()

    this.setupRoutes() // Setup routes within the constructor
  }

  private setupRoutes() {
    // Process related routes
    this.router
      .get("/processes", (ctx) => {
        ctx.response.body = this.pupApi.allProcessStates()
      })
      .get("/state", (ctx) => {
        const ProcessStatees = this.pupApi.applicationState()
        ctx.response.body = ProcessStatees
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

    // Application State route
    this.router.get("/application-state", (ctx) => {
      ctx.response.body = this.pupApi.applicationState()
    })

    // Termination route
    this.router.post("/terminate", (ctx) => {
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

    // Logging routes
    this.router
    /*.post("/log", async (ctx) => {
        // Read severity, plugin, and message from request body
        const body = await ctx.request.body().value
        this.pupApi.log(body.severity, body.plugin, body.message)
        ctx.response.status = Status.Created
      })*/
    this.router.get("/logs", async (context) => {
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

    this.app.use(authMiddleware)
    this.app.use(this.router.routes())
    this.app.use(this.router.allowedMethods())
  }

  public async start(port = 8001) {
    this.pupApi.log("info", "rest", `Starting the REST API`)
    await this.app.listen({ port, signal: this.appAbortController.signal })
    this.pupApi.log("info", "rest", `REST API listening on port ${port}`)
  }

  public terminate() {
    this.appAbortController.abort()
  }
}
