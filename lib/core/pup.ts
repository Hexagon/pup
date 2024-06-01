/**
 * Exports main class of Pup - `Pup`
 *
 * @file      lib/core/pup.ts
 * @license   MIT
 */

import {
  type Configuration,
  DEFAULT_INTERNAL_LOG_HOURS,
  DEFAULT_SECRET_FILE_PERMISSIONS,
  type GlobalLoggerConfiguration,
  MAINTENANCE_INTERVAL_MS,
  PLUGIN_TOKEN_EXPIRE_S,
  PLUGIN_TOKEN_REFRESH_ADVANCE_S,
  type ProcessConfiguration,
  validateConfiguration,
  WATCHDOG_INTERVAL_MS,
} from "./configuration.ts"
import { Logger } from "./logger.ts"
import { Process } from "./process.ts"
import { ApiProcessState } from "@pup/api-definitions"
import { Status } from "./status.ts"
import { Cluster } from "./cluster.ts"
import { RestApi } from "./rest.ts"
import { EventEmitter } from "@pup/common/eventemitter"
import { toPersistentPath, toResolvedAbsolutePath, toTempPath } from "@pup/common/path"
import { Prop } from "../common/prop.ts"
import type { ApiTelemetryData } from "@pup/api-definitions"
import { rm } from "@cross/fs"
import { findFreePort } from "./port.ts"
import { Plugin } from "./plugin.ts"
import { GenerateToken, SecondsToExpiry } from "../common/token.ts"
import { CurrentRuntime, Runtime } from "@cross/runtime"
import { delay } from "@std/async"
interface InstructionResponse {
  success: boolean
  action?: string
  error?: string
}

class Pup {
  public configuration: Configuration
  public logger: Logger
  public status: Status
  public events: EventEmitter
  public restApi?: RestApi

  public processes: (Process | Cluster)[] = []
  public plugins: Plugin[] = []
  private requestTerminate = false

  private watchdogTimer?: number

  private maintenanceTimer?: number

  public temporaryStoragePath?: string
  public persistentStoragePath?: string
  public configFilePath?: string

  public cleanupQueue: string[] = []
  public secret?: Prop
  public port?: Prop

  static async init(unvalidatedConfiguration: unknown, configFilePath?: string): Promise<Pup> {
    const temporaryStoragePath: string | undefined = configFilePath ? await toTempPath(configFilePath) : undefined
    const persistentStoragePath: string | undefined = configFilePath ? await toPersistentPath(configFilePath) : undefined
    return new Pup(unvalidatedConfiguration, configFilePath, temporaryStoragePath, persistentStoragePath)
  }

  constructor(unvalidatedConfiguration: unknown, configFilePath?: string, temporaryStoragePath?: string, persistentStoragePath?: string) {
    // Setup paths
    let statusFile
    let logStore
    let secretFile
    let portFile
    if (configFilePath && temporaryStoragePath && persistentStoragePath) {
      this.configFilePath = toResolvedAbsolutePath(configFilePath)

      this.temporaryStoragePath = temporaryStoragePath
      this.cleanupQueue.push(this.temporaryStoragePath)

      this.persistentStoragePath = persistentStoragePath

      statusFile = `${this.persistentStoragePath}/.main.status.ckvdb` // Cross/KV store
      secretFile = `${this.persistentStoragePath}/.main.secret` // Plain text file containing the JWT secret for the rest api
      portFile = `${this.temporaryStoragePath}/.main.port` // Plain text file containing the port number for the API
      logStore = `${this.persistentStoragePath}/.main.log.ckvdb` // Cross/KV store
    }

    // Throw on invalid configuration
    this.configuration = validateConfiguration(unvalidatedConfiguration)

    // Initialise core logger
    this.logger = new Logger(this.configuration.logger ?? {}, logStore || "./main.log")

    // Global error handler
    this.registerGlobalErrorHandler()

    // EventEmitter
    this.events = new EventEmitter()

    // Initialise status tracker
    this.status = new Status(statusFile)

    // Initialize API secret
    if (secretFile) {
      this.secret = new Prop(secretFile, DEFAULT_SECRET_FILE_PERMISSIONS)
    }

    // Initialize API port
    if (portFile) this.port = new Prop(portFile)
  }

  /**
   * This is intended to be called by global unload event
   * and clears any stray files
   */
  public cleanup = async (): Promise<void> => {
    for (const cleanupFilePath of this.cleanupQueue) {
      try {
        await rm(cleanupFilePath, { recursive: true })
        this.logger.info("cleanup", `${cleanupFilePath} removed.`)
      } catch (_e) {
        // Ignore errors
      }
    }

    // Unset last application state
    await this.status.cleanup()

    // Close logger
    await this.logger.cleanup()
  }

  public init = async (): Promise<void> => {
    // Intialize logging
    await this.logger.init()

    // Initialize api
    await this.api()

    // Initialize plugins
    if (this.configuration.plugins) {
      const secret = await this.secret?.load()
      const pluginToken = await GenerateToken(secret!, { consumer: "plugin" }, Date.now() + PLUGIN_TOKEN_EXPIRE_S * 1000)
      for (const plugin of this.configuration.plugins) {
        const newPlugin = new Plugin(plugin, `${this.restApi?.hostname}:${this.restApi?.port}`, pluginToken)
        let success = true
        try {
          this.logger.log("plugins", `Loading plugin from '${plugin.url}'`)
          await newPlugin.load()
        } catch (e) {
          this.logger.error("plugins", `Failed to load plugin '${plugin.url}: ${e.message}'`)
          success = false
        }
        try {
          this.logger.log("plugins", `Verifying plugin from '${plugin.url}'`)
          newPlugin.verify()
        } catch (e) {
          this.logger.error("plugins", `Failed to verify plugin '${plugin.url}': ${e.message}`)
          success = false
        }
        if (success) {
          this.plugins.push(newPlugin)
          this.logger.log("plugins", `Plugin '${newPlugin.impl?.meta.name}@${newPlugin.impl?.meta.version}' loaded from '${plugin.url}'`)
        }
      }
    }

    // Attach logger to events
    this.logger.attach(
      (
        severity: string,
        category: string,
        text: string,
        process?: ProcessConfiguration,
      ): boolean => {
        this.events.emit("log", {
          timeStamp: Date.now(),
          severity,
          category,
          text,
          processId: process?.id,
        })
        return false
      },
    )

    // Create processes
    if (this.configuration.processes) {
      for (const process of this.configuration.processes) {
        // Cluster or normal process?
        if (process.cluster) {
          this.logger.log("processes", `Cluster '${process.id}' loading`)
          const newProcess = new Cluster(this, process)
          this.processes.push(newProcess)
        } else {
          const newProcess = new Process(this, process)
          this.logger.log("processes", `Process '${process.id}' loaded`)
          this.processes.push(newProcess)
        }
      }
    }

    this.events.emit("init")

    // Initiate all processes
    for (const process of this.processes) {
      process.init()
    }

    this.watchdog()
    this.maintenance(true)
  }

  public allProcesses(): Process[] {
    const allProcesses = []
    for (const process of this.processes) {
      // Always add current process (even clusters)
      allProcesses.push(process)

      // Add all subprocesses if current process is a cluster
      if (process instanceof Cluster) {
        for (const cProcess of process.processes) {
          allProcesses.push(cProcess)
        }
      }
    }
    return allProcesses
  }

  /**
   * Function to set telemetry data of a process
   *
   * @private
   */
  public telemetry(data: ApiTelemetryData): boolean {
    let success = false
    if (data.sender && typeof data.sender === "string") {
      const cleanedId = data.sender.trim().toLocaleLowerCase()
      const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
      if (foundProcess) {
        this.events.emit("process_telemetry", structuredClone(data))
        foundProcess?.setTelemetry(data)
        success = true
      }
    }
    return success
  }

  /**
   * Watchdog function that manages process lifecycle events like
   * auto-start, restart, and timeouts.
   *
   * @private
   */
  private watchdog = async () => {
    this.events.emit("watchdog")
    // Wrap watchdog operation in a catch to prevent it from ever stopping
    try {
      // Loop through all processes, checking if some actions are needed
      for (const process of this.allProcesses()) {
        const status = process.getStatus()
        const config = process.getConfig()

        // Handle initial starts
        if (config.autostart && status.status === ApiProcessState.CREATED) {
          process.start("autostart")
        }

        // Handle pending restart
        if (status.status !== ApiProcessState.STOPPING && process.isPendingRestart()) {
          process.start(process["pendingRestartReason"])
        }

        // Handle restarts
        if (status.status === ApiProcessState.FINISHED || status.status === ApiProcessState.ERRORED) {
          const msSinceExited = status.exited ? (new Date().getTime() - status.exited?.getTime()) : Infinity

          // Default restart delay to 10000ms, except when watching
          const restartDelay = config.restartDelayMs ?? config.watch ? 500 : 10000

          // Always restart if restartpolicy is undefined and autostart is true
          const restartPolicy = config.restart ?? ((config.autostart || config.watch) ? "always" : undefined)

          if (msSinceExited > restartDelay) {
            /* Always restart if the process exits, with that restart policy */
            if (restartPolicy === "always") {
              process.start("restart", true)

              /* Restart on error if ApiProcessState is ERRORED */
            } else if (
              restartPolicy === "error" &&
              status.status === ApiProcessState.ERRORED
            ) {
              process.start("restart", true)
            }
          }
        }

        // Handle timeouts
        if (status.status === ApiProcessState.RUNNING && config.timeout && status.started) {
          const secondsSinceStart = (new Date().getTime() - status.started.getTime()) / 1000
          if (secondsSinceStart > config.timeout) {
            process.stop("timeout")
          }
        }
      }
    } catch (e) {
      this.logger.error("watchdog", "Watchdog error: ", e)
    }

    // Update process status
    try {
      const applicationState = this.status.applicationState(this.processes, this.port)
      this.events.emit("application_state", applicationState)
      const logHours = this.configuration.logger?.internalLogHours === undefined ? DEFAULT_INTERNAL_LOG_HOURS : this.configuration.logger?.internalLogHours
      if (logHours > 0) {
        this.status.writeToStore(applicationState)
      }
    } catch (e) {
      this.logger.error("watchdog", `Heartbeat update failed: ${e}`)
    }

    // Refresh plugin tokens if needed
    try {
      for (const plugin of this.plugins) {
        // Parse token and check seconds left to expiry
        const secondsLeft = await SecondsToExpiry(plugin.getToken())
        if (secondsLeft !== undefined && secondsLeft < PLUGIN_TOKEN_REFRESH_ADVANCE_S) {
          this.logger.log("plugins", `API token for plugin '${plugin.impl?.meta.name} is about to expire in ${secondsLeft}s. Refreshing token.`)
          const secret = this.secret?.fromCache()
          if (secret) {
            // Send a fresh token to the plugin
            const newPluginToken = await GenerateToken(secret!, { consumer: "plugin" }, Date.now() + PLUGIN_TOKEN_EXPIRE_S * 1000)
            plugin.refreshToken(newPluginToken)
          }
        }
      }
    } catch (e) {
      this.logger.error("watchdog", `API Token refresh failed: ${e}`)
    }

    // Reschedule watchdog
    if (!this.requestTerminate) {
      this.watchdogTimer = setTimeout(() => {
        // Exit watchdog if terminating
        this.watchdog()
      }, WATCHDOG_INTERVAL_MS)
    }
  }

  /**
   * Starts the api
   * @private
   */
  private api = async () => {
    const secret = await this.secret?.load()
    if (!secret) return

    const port = await this.port?.generate(async () => {
      const resultingPort = this.configuration.api?.port || await findFreePort()
      return resultingPort.toString()
    })

    // Initializing rest api
    this.logger.info("rest", "Initializing rest api")

    // Initialize rest api
    try {
      this.restApi = new RestApi(this, this.configuration.api?.hostname, parseInt(port!, 10), secret)
      this.restApi.start()
    } catch (e) {
      this.logger.error(
        "rest",
        `An error occured while inizializing the rest api: ${e.message}`,
      )
    }
  }

  /**
   * Performs periodic maintenance tasks in Pup.
   * Purges logs and state information older than the specified `keepHours`.
   * This method is scheduled to run every hour.
   *
   * @private
   */
  private maintenance = async (skip = false) => {
    if (!skip) {
      this.logger.log("maintenance", "Performing periodic maintenance")

      const keepHours = this.configuration.logger?.internalLogHours === undefined ? DEFAULT_INTERNAL_LOG_HOURS : this.configuration.logger?.internalLogHours

      // Purge logs
      const logsPurged = await this.logger.purge(keepHours)
      this.logger.log("maintenance", `Purged log entries: ${logsPurged}`)

      // Purge state
      const statusPurged = await this.status.purge(keepHours)
      this.logger.log("maintenance", `Purged status entries: ${statusPurged}`)
    }

    // Schedule next maintenance
    // - also make maintenance timer non-blocking using Deno.unrefTimer
    this.maintenanceTimer = setTimeout(() => {
      this.maintenance()
    }, MAINTENANCE_INTERVAL_MS)
    if (CurrentRuntime === Runtime.Deno) {
      Deno.unrefTimer(this.maintenanceTimer)
      // @ts-ignore unref exists in node and bun
    } else if (this.maintenanceTimer?.unref) {
      // @ts-ignore unref exists in node and bun
      this.maintenanceTimer.unref()
    }
  }

  public restart(id: string, requestor: string): boolean {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      foundProcess.restart(requestor)
      return true
    } else {
      console.error("Rpc: Got signal to restart process which does not exist.")
      return false
    }
  }

  public start(id: string, requestor: string): boolean {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      if (foundProcess.getStatus().blocked) {
        return false
      } else {
        // Start will not return until the child process is done, so we can not await this call
        foundProcess.start(requestor)
        return true
      }
    } else {
      console.error("Rpc: Got signal to stop process which does not exist.")
      return false
    }
  }

  public async stop(id: string, requestor: string): Promise<boolean> {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      return await foundProcess.stop(requestor)
    } else {
      console.error("Rpc: Got signal to stop process which does not exist.")
      return false
    }
  }

  public block(id: string, requestor: string): boolean {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      foundProcess.block(requestor)
      return true
    } else {
      console.error("Rpc: Got signal to block process which does not exist.")
      return false
    }
  }

  public unblock(id: string, requestor: string): boolean {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      foundProcess.unblock(requestor)
      return true
    } else {
      console.error("Rpc: Got signal to unblock process which does not exist.")
      return false
    }
  }

  public async terminate(forceQuitMs: number) {
    // Point of no return

    // Bail out if termination has already started
    if (this.requestTerminate) {
      return
    }

    // Terminate all plugins
    for (const plugin of this.plugins) {
      await plugin.terminate()
    }

    // Stop watchdog
    this.requestTerminate = true

    clearTimeout(this.watchdogTimer)
    clearTimeout(this.maintenanceTimer)

    await this.logger.log("terminate", "Termination requested")

    this.events.emit("terminating", forceQuitMs)

    const stoppingProcesses: Promise<boolean>[] = []

    // Block and stop all processes
    for (const process of this.processes) {
      process.block("terminating")
      stoppingProcesses.push(
        process.stop("terminating").then((result) => {
          process.cleanup()
          return result
        }),
      )
    }

    // Terminate api
    if (this.restApi) this.restApi.terminate()

    await Promise.allSettled(stoppingProcesses)

    // Cleanup
    await this.cleanup()

    // Allow some extra time to pass to allow untracked async tasks
    // (such as logs about closing down) to finish
    // - But only if at least 500ms were used as grace period
    if (forceQuitMs >= 500) await delay(500)

    // Deno should exit gracefully now
  }

  private registerGlobalErrorHandler() {
    // @ts-ignore Cross Runtime
    if (globalThis.addEventListener) {
      addEventListener("error", (event) => {
        this.logger.error(
          "fatal",
          `Unhandled error caught by core: ${event.error.message}`,
        )
        event.preventDefault()
      })
    }
  }
}

export { Pup }
export type { GlobalLoggerConfiguration, InstructionResponse, ProcessConfiguration }
