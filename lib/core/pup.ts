/**
 * Exports main class of Pup - `Pup`
 *
 * @file      lib/core/pup.ts
 * @license   MIT
 */

import { Configuration, DEFAULT_INTERNAL_LOG_HOURS, GlobalLoggerConfiguration, MAINTENANCE_INTERVAL_MS, ProcessConfiguration, validateConfiguration, WATCHDOG_INTERVAL_MS } from "./configuration.ts"
import { FileIPC, IpcValidatedMessage } from "../common/ipc.ts"
import { Logger } from "./logger.ts"
import { Process, ProcessState } from "./process.ts"
import { Status } from "./status.ts"
import { Plugin } from "./plugin.ts"
import { Cluster } from "./cluster.ts"
import { path, uuid } from "../../deps.ts"
import { EventEmitter } from "../common/eventemitter.ts"
import { toPersistentPath, toTempPath } from "../common/utils.ts"

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
  public ipc?: FileIPC

  public processes: (Process | Cluster)[] = []
  public plugins: Plugin[] = []

  private requestTerminate = false

  private watchdogTimer?: number

  private maintenanceTimer?: number

  public temporaryStoragePath?: string
  public persistentStoragePath?: string
  public configFilePath?: string

  public cleanupQueue: string[] = []

  static async init(unvalidatedConfiguration: unknown, configFilePath?: string) {
    const temporaryStoragePath: string | undefined = configFilePath ? await toTempPath(configFilePath) : undefined
    const persistentStoragePath: string | undefined = configFilePath ? await toPersistentPath(configFilePath) : undefined
    return new Pup(unvalidatedConfiguration, configFilePath, temporaryStoragePath, persistentStoragePath)
  }

  constructor(unvalidatedConfiguration: unknown, configFilePath?: string, temporaryStoragePath?: string, persistentStoragePath?: string) {
    // Setup paths
    let statusFile
    let ipcFile
    let logStore
    if (configFilePath && temporaryStoragePath && persistentStoragePath) {
      this.configFilePath = path.resolve(configFilePath)

      this.temporaryStoragePath = temporaryStoragePath
      this.cleanupQueue.push(this.temporaryStoragePath)

      this.persistentStoragePath = persistentStoragePath

      ipcFile = `${this.temporaryStoragePath}/.main.ipc` // Plain text file (serialized js object)
      statusFile = `${this.persistentStoragePath}/.main.status` // Deno KV store

      logStore = `${this.persistentStoragePath}/.main.log` // Deno KV store
    }

    // Throw on invalid configuration
    this.configuration = validateConfiguration(unvalidatedConfiguration)

    // Initialise core logger
    this.logger = new Logger(this.configuration.logger ?? {}, logStore)

    // Global error handler
    this.registerGlobalErrorHandler()

    // EventEmitter
    this.events = new EventEmitter()

    // Initialise status tracker
    this.status = new Status(statusFile)

    // Initialize file ipc, if a path were passed
    if (ipcFile) this.ipc = new FileIPC(ipcFile)
  }

  /**
   * This is intended to be called by global unload event
   * and clears any stray files
   */
  public cleanup = async () => {
    for (const cleanupFilePath of this.cleanupQueue) {
      try {
        await Deno.remove(cleanupFilePath, { recursive: true })
        this.logger.info("cleanup", `${cleanupFilePath} removed.`)
      } catch (_e) {
        // Ignore errors
      }
    }

    // Unset last application state
    await this.status.cleanup()
  }

  public init = async () => {
    // Initilize ipc
    this.receiveData()

    // Initialize plugins
    if (this.configuration.plugins) {
      for (const plugin of this.configuration.plugins) {
        const newPlugin = new Plugin(this, plugin)
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

    // Attach plugins to logger
    this.logger.attach((severity: string, category: string, text: string, process?: ProcessConfiguration): boolean => {
      this.events.emit("log", {
        severity,
        category,
        text,
        process,
      })
      return this.pluginHook("log", {
        severity,
        category,
        text,
        process,
      })
    })

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

    // Call all plugins
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
      // Add all subprocesses if current process is a cluster
      if (process instanceof Cluster) {
        for (const cProcess of process.processes) {
          allProcesses.push(cProcess)
        }
      }

      // Always add current process (even clusters)
      allProcesses.push(process)
    }
    return allProcesses
  }

  /**
   * Watchdog function that manages process lifecycle events like
   * auto-start, restart, and timeouts.
   *
   * @private
   */
  private watchdog = () => {
    this.events.emit("watchdog")

    // Wrap watchdog operation in a catch to prevent it from ever stopping
    try {
      // Loop through all processes, checking if some actions are needed
      for (const process of this.allProcesses()) {
        const status = process.getStatus()
        const config = process.getConfig()

        // Handle initial starts
        if (config.autostart && status.status === ProcessState.CREATED) {
          process.start("autostart")
        }

        // Handle pending restart
        if (status.status !== ProcessState.STOPPING && process.isPendingRestart()) {
          process.start(process["pendingRestartReason"])
        }

        // Handle restarts
        if (status.status === ProcessState.FINISHED || status.status === ProcessState.ERRORED) {
          const msSinceExited = status.exited ? (new Date().getTime() - status.exited?.getTime()) : Infinity

          // Default restart delay to 10000ms, except when watching
          const restartDelay = config.restartDelayMs ?? config.watch ? 500 : 10000

          // Always restart if restartpolicy is undefined and autostart is true
          const restartPolicy = config.restart ?? ((config.autostart || config.watch) ? "always" : undefined)

          if (msSinceExited > restartDelay) {
            /* Always restart if the process exits, with that restart policy */
            if (restartPolicy === "always") {
              process.start("restart", true)

              /* Restart on error if ProcessState is ERRORED */
            } else if (
              restartPolicy === "error" &&
              status.status === ProcessState.ERRORED
            ) {
              process.start("restart", true)
            }
          }
        }

        // Handle timeouts
        if (status.status === ProcessState.RUNNING && config.timeout && status.started) {
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
      const applicationState = this.status.applicationState(this.processes)
      this.events.emit("application_state", applicationState)
      const logHours = this.configuration.logger?.internalLogHours === undefined ? DEFAULT_INTERNAL_LOG_HOURS : this.configuration.logger?.internalLogHours
      if (logHours > 0) {
        this.status.writeToStore(applicationState)
      }
    } catch (e) {
      this.logger.error("watchdog", `Heartbeat update failed: ${e}`)
    }

    // Reschedule watchdog
    if (!this.requestTerminate) {
      this.watchdogTimer = setTimeout(() => {
        // Exit watchdog if terminating
        this.watchdog()
      }, WATCHDOG_INTERVAL_MS)
      Deno.unrefTimer(this.watchdogTimer)
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
    Deno.unrefTimer(this.maintenanceTimer)
  }

  private async receiveData() {
    if (this.ipc) {
      try {
        for await (const messages of this.ipc.receiveData()) {
          if (messages.length > 0) {
            for (const message of messages) {
              try {
                this.processIpcMessage(message)
              } catch (e) {
                this.logger.error("ipc", `Error while processing IPC message: ${e.message}`)
              }
            }
          }
        }
      } catch (e) {
        this.logger.error("ipc", `Error while starting IPC watcher: ${e.message}`)
      }
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

  /* Plugin hooks is a special type of events that can be used by plugins to block normal operation */
  private pluginHook(signal: string, args: unknown): boolean {
    let result = false
    for (const plugin of this.plugins) {
      if (plugin.impl && plugin.impl.hook) {
        const pluginResult = plugin.impl.hook(signal, args)
        if (pluginResult) result = true
      }
    }
    return result
  }

  private async processIpcMessage(message: IpcValidatedMessage) {
    if (!this.ipc) {
      throw new Error("IPC not initialized")
    }

    this.events.emit("ipc", message)

    if (message.data) {
      try {
        const parsedMessage = JSON.parse(message.data)
        const response = this.handleInstruction(message)

        // If senderUuid is set, send response back to sender
        if (parsedMessage.senderUuid && uuid.v4.validate(parsedMessage.senderUuid)) {
          const fileIpc = new FileIPC(this.ipc.getFilePath() + "." + parsedMessage.senderUuid)
          await fileIpc.sendData(JSON.stringify(response))
        }

        // All is ok!
      } catch (_error) {
        // Ignore
        this.logger.warn("ipc", "Received invalid IPC message (2)")
      }
    } else {
      // Ignore
      this.logger.warn("ipc", "Received invalid IPC message (3)")
    }
  }

  private async handleInstruction(message: IpcValidatedMessage) {
    let response: InstructionResponse = { success: false, action: "", error: "No message data" }
    if (message.data !== null) {
      try {
        const parsedMessage = JSON.parse(message.data)
        if (parsedMessage.start) {
          let success = true
          if (parsedMessage.start.trim().toLocaleLowerCase() === "all") {
            for (const process of this.allProcesses()) {
              process.start("ipc")
            }
            // ToDo, also check valid characters
          } else if (parsedMessage.start.length >= 1 && parsedMessage.start.length <= 64) {
            success = this.start(parsedMessage.start, "ipc")
          }
          response = { success, action: "start" }
        } else if (parsedMessage.stop) {
          let success = true
          if (parsedMessage.stop.trim().toLocaleLowerCase() === "all") {
            for (const process of this.allProcesses()) {
              process.stop("ipc")
            }
            // ToDo, also check valid characters
          } else if (parsedMessage.stop.length >= 1 && parsedMessage.stop.length <= 64) {
            success = await this.stop(parsedMessage.stop, "ipc")
          }
          response = { success, action: "stop" }
        } else if (parsedMessage.restart) {
          let success = true
          if (parsedMessage.restart.trim().toLocaleLowerCase() === "all") {
            for (const process of this.allProcesses()) {
              process.restart("ipc")
            }
            // ToDo, also check valid characters
          } else if (parsedMessage.restart.length >= 1 && parsedMessage.restart.length <= 64) {
            success = this.restart(parsedMessage.restart, "ipc")
          }
          response = { success, action: "restart" }
        } else if (parsedMessage.block) {
          let success = true
          if (parsedMessage.block.trim().toLocaleLowerCase() === "all") {
            for (const process of this.allProcesses()) {
              process.block("ipc")
            }
            // ToDo, also check valid characters
          } else if (parsedMessage.block.length >= 1 && parsedMessage.block.length <= 64) {
            success = this.block(parsedMessage.block, "ipc")
          }
          response = { success, action: "block" }
        } else if (parsedMessage.unblock) {
          let success = true
          if (parsedMessage.unblock.trim().toLocaleLowerCase() === "all") {
            for (const process of this.allProcesses()) {
              process.unblock("ipc")
            }
            // ToDo, also check valid characters
          } else if (parsedMessage.unblock.length >= 1 && parsedMessage.unblock.length <= 64) {
            success = this.unblock(parsedMessage.unblock, "ipc")
          }
          response = { success, action: "unblock" }
        } else if (parsedMessage.event && parsedMessage.event === "telemetry") {
          const telemetry = parsedMessage.eventData
          let success = false
          if (telemetry.sender && typeof telemetry.sender === "string") {
            const cleanedId = telemetry.sender.trim().toLocaleLowerCase()
            const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
            if (foundProcess) {
              this.events.emit("process_telemetry", structuredClone(telemetry))
              delete telemetry.sender
              foundProcess?.setTelemetry(telemetry)
              success = true
            }
          }
          response = { success, action: "telemetry" }
        } else if (parsedMessage.terminate) {
          // Defer actual termination to allow response to be sent
          Deno.unrefTimer(setTimeout(() => this.terminate(30000), 500))
          response = { success: true, action: "terminate" }
        } else {
          response = { success: false, action: "unknown" }
        }
      } catch (e) {
        response = { success: false, action: "error", error: e.message }
      }
      return response
    } else {
      return response
    }
  }

  public async terminate(forceQuitMs: number) {
    // Point of no return

    // Bail out if termination has already started
    if (this.requestTerminate) {
      return
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

    // Close IPC
    if (this.ipc) {
      await this.ipc.close()
    }

    // Terminate all plugins
    for (const plugin of this.plugins) {
      await plugin.terminate()
    }

    // Cleanup
    await this.cleanup()

    await Promise.allSettled(stoppingProcesses)

    // Deno should exit gracefully now
  }

  private registerGlobalErrorHandler() {
    addEventListener("error", (event) => {
      this.logger.error("fatal", `Unhandled error caught by core: ${event.error.message}`)
      event.preventDefault()
    })
  }
}

export { Pup }
export type { GlobalLoggerConfiguration, InstructionResponse, ProcessConfiguration }
