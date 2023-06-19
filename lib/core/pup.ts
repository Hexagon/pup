/**
 * Exports main class of Pup - `Pup`
 *
 * @file      lib/core/pup.ts
 * @license   MIT
 */

import { Configuration, GlobalLoggerConfiguration, ProcessConfiguration, validateConfiguration } from "./configuration.ts"
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

  private WATCHDOG_INTERVAL_MS = 2000
  private watchdogTimer?: number

  private MAINTENANCE_INTERVAL_MS = 900 * 1000
  private maintenanceTimer?: number

  public temporaryStoragePath?: string
  public persistentStoragePath?: string
  public configFilePath?: string

  public cleanupQueue: string[] = []

  constructor(unvalidatedConfiguration: unknown, configFilePath?: string) {
    // Setup paths
    let statusFile
    let ipcFile
    let logStore
    if (configFilePath) {
      this.configFilePath = path.resolve(configFilePath)

      this.temporaryStoragePath = toTempPath(this.configFilePath)
      this.cleanupQueue.push(this.temporaryStoragePath)

      this.persistentStoragePath = toPersistentPath(this.configFilePath)

      ipcFile = `${this.temporaryStoragePath}/.main.ipc` // Plain text file (serialized js object)
      statusFile = `${this.persistentStoragePath}/.main.status` // Deno KV store

      logStore = `${this.persistentStoragePath}/.main.log` // Deno KV store
    }

    // Throw on invalid configuration
    this.configuration = validateConfiguration(unvalidatedConfiguration)

    // Initialise core logger
    this.logger = new Logger(this.configuration.logger ?? {}, logStore)

    // EventEmitter
    this.events = new EventEmitter()

    // Initialise status tracker
    this.status = new Status(statusFile)

    // Initialize file ipc, if a path were passed
    if (ipcFile) this.ipc = new FileIPC(ipcFile)
  }

  public cleanup = () => {
    // This is intended to be called by global unload event
    // and clears any stray files
    for (const cleanupFilePath of this.cleanupQueue) {
      try {
        Deno.remove(cleanupFilePath, { recursive: true })
        this.logger.log("cleanup", `${cleanupFilePath} removed.`)
        // Ignore errors
      } catch (_e) {
        this.logger.error("cleanup", `${cleanupFilePath} could not be removed, will be left.`)
      }
    }

    // Unset last application state
    this.status.cleanup()
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
    this.maintenance()
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
      const logHours = this.configuration.logger?.internalLogHours === undefined ? 24 : this.configuration.logger?.internalLogHours
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
      }, this.WATCHDOG_INTERVAL_MS)
    }
  }

  /**
   * Performs periodic maintenance tasks in Pup.
   * Purges logs and state information older than the specified `keepHours`.
   * This method is scheduled to run every hour.
   *
   * @private
   */
  private maintenance = async () => {
    this.logger.log("maintenance", "Performing periodic maintenance")

    const keepHours = this.configuration.logger?.internalLogHours === undefined ? 24 : this.configuration.logger?.internalLogHours

    // Purge logs
    const logsPurged = await this.logger.purge(keepHours)
    this.logger.log("maintenance", `Purged log entries: ${logsPurged}`)

    // Purge state
    const statusPurged = await this.status.purge(keepHours)
    this.logger.log("maintenance", `Purged status entries: ${statusPurged}`)

    // Schedule next maintenance
    this.maintenanceTimer = setTimeout(() => {
      this.maintenance()
    }, this.MAINTENANCE_INTERVAL_MS)

    // Make maintenance timer non-blocking
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
      foundProcess.start(requestor)
      return true
    } else {
      console.error("Rpc: Got signal to stop process which does not exist.")
      return false
    }
  }

  public stop(id: string, requestor: string): boolean {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      foundProcess.stop(requestor)
      return true
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

  private handleInstruction(message: IpcValidatedMessage) {
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
            success = this.stop(parsedMessage.stop, "ipc")
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
          setTimeout(() => this.terminate(30000), 500)
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
    // Stop watchdog
    this.requestTerminate = true
    clearTimeout(this.watchdogTimer)
    clearTimeout(this.maintenanceTimer)

    this.logger.log("terminate", "Termination requested")

    this.events.emit("terminating", forceQuitMs)

    // Block and stop all processes
    for (const process of this.processes) {
      process.block("terminating")
      process.stop("terminating")
    }

    // Force quit after 30 seconds
    const timer = setTimeout(() => {
      this.logger.warn("terminate", "Terminating by force")
      Deno.exit(0)
    }, forceQuitMs)
    Deno.unrefTimer(timer) // Unref force quit timer to allow the process to exit earlier

    // Close IPC
    if (this.ipc) {
      await this.ipc.close()
    }

    // Cleanup
    this.cleanup()
  }
}

export { Pup }
export type { GlobalLoggerConfiguration, InstructionResponse, ProcessConfiguration }
