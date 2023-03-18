import { Configuration, GlobalLoggerConfiguration, ProcessConfiguration, validateConfiguration } from "./configuration.ts"
import { FileIPC, ValidatedMessage } from "./ipc.ts"
import { Logger } from "./logger.ts"
import { Process, ProcessStatus } from "./process.ts"
import { Status } from "./status.ts"
import { Plugin } from "./plugin.ts"
import { Cluster } from "./cluster.ts"
import { path } from "../../deps.ts"

class Pup {
  public configuration: Configuration
  public logger: Logger
  public status: Status
  public ipc?: FileIPC

  public processes: (Process | Cluster)[] = []
  public plugins: Plugin[] = []

  private requestTerminate = false

  private WATCHDOG_INTERVAL_MS = 2000

  // Put path of temporary/status files here
  public cleanupQueue: string[] = []

  constructor(unvalidatedConfiguration: unknown, statusFile?: string, ipcFile?: string) {
    // Throw on invalid configuration
    this.configuration = validateConfiguration(unvalidatedConfiguration)

    // Initialise core logger
    this.logger = new Logger(this.configuration.logger ?? {})

    // Initialize plugins
    if (this.configuration.plugins) {
      for (const plugin of this.configuration.plugins) {
        const newPlugin = new Plugin(this, plugin)
        try {
          this.logger.log("plugins", `Loading plugin from '${plugin.url}'`)
          newPlugin.load()
        } catch (_e) {
          this.logger.error("plugins", `Failed to load plugin '${plugin.url}'`)
        }
        this.plugins.push(newPlugin)
      }
    }

    // Attach plugins to logger
    this.logger.attach((severity: string, category: string, text: string, process?: ProcessConfiguration): boolean => {
      return this.pluginSignal("logger", {
        severity,
        category,
        text,
        process,
      })
    })

    // Initialise status tracker
    this.status = new Status(statusFile)
    if (statusFile) this.cleanupQueue.push(path.resolve(statusFile))

    // Initialize file ipc, if a path were passed
    this.ipc = ipcFile ? new FileIPC(ipcFile) : undefined
    if (ipcFile) this.cleanupQueue.push(path.resolve(ipcFile))

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
  }

  public cleanup = () => {
    // This is intended to be called by global unload event
    // and clears any stray files
    for (const cleanupFilePath of this.cleanupQueue) {
      try {
        Deno.remove(cleanupFilePath)
        this.logger.log("cleanup", `${cleanupFilePath} removed.`)
        // Ignore errors
      } catch (_e) {
        this.logger.error("cleanup", `${cleanupFilePath} could not be removed, will be left.`)
      }
    }
  }

  public init = () => {
    // Initiate all processes
    for (const process of this.processes) {
      process.init()
    }

    // Call all plugins
    this.pluginSignal("init", {})

    this.watchdog()
  }

  private allProcesses(): Process[] {
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
    this.pluginSignal("watchdog", {})

    // Wrap watchdog operation in a catch to prevent it from ever stopping
    try {
      // Loop through all processes, checking if some actions are needed
      for (const process of this.allProcesses()) {
        const status = process.getStatus()
        const config = process.getConfig()

        // Handle initial starts
        if (config.autostart && status.status === ProcessStatus.CREATED) {
          process.start("autostart")
        }

        // Handle pending restart
        if (status.status !== ProcessStatus.STOPPING && process.isPendingRestart()) {
          process.start(process["pendingRestartReason"])
        }

        // Handle restarts
        if (status.status === ProcessStatus.FINISHED || status.status === ProcessStatus.ERRORED) {
          const msSinceExited = status.exited ? (new Date().getTime() - status.exited?.getTime()) : Infinity

          // Default restart delay to 10000ms, except when watching
          const restartDelay = config.restartDelayMs ?? config.watch ? 500 : 10000

          // Always restart if restartpolicy is undefined and autostart is true
          const restartPolicy = config.restart ?? ((config.autostart || config.watch) ? "always" : undefined)

          if (msSinceExited > restartDelay) {
            /* Always restart if the process exits, with that restart policy */
            if (restartPolicy === "always") {
              process.start("restart", true)

              /* Restart on error if ProcessStatus is ERRORED */
            } else if (
              restartPolicy === "error" &&
              status.status === ProcessStatus.ERRORED &&
              status.code !== 143
            ) {
              process.start("restart", true)
            }
          }
        }

        // Handle timeouts
        if (status.status === ProcessStatus.RUNNING && config.timeout && status.started) {
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
      this.status.writeToDisk(this.processes)
    } catch (e) {
      this.logger.error("watchdog", `Heartbeat update failed: ${e}`)
    }

    // Check IPC
    if (this.ipc) this.processIpc()

    // Reschedule watchdog
    // ToDo: Exit if all processes are exhausted?
    if (!this.requestTerminate) {
      setTimeout(() => {
        // Exit watchdog if terminating
        this.watchdog()
      }, this.WATCHDOG_INTERVAL_MS)
    }
  }

  private async processIpc() {
    if (this.ipc) {
      try {
        const data = await this.ipc.receiveData()
        if (data.length) {
          for (const message of data) {
            try {
              await this.processIpcMessage(message)
            } catch (e) {
              console.error("Error while processing IPC message: ", e.message)
            }
          }
        }
      } catch (e) {
        console.error("IPC error: ", e.message)
      }
    }
  }

  private restart(id: string) {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      foundProcess.restart("rpc")
    } else {
      console.error("Rpc: Got signal to restart process which does not exist.")
    }
  }

  private start(id: string) {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      foundProcess.start("ipc")
    } else {
      console.error("Rpc: Got signal to stop process which does not exist.")
    }
  }

  private stop(id: string) {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      foundProcess.stop("ipc")
    } else {
      console.error("Rpc: Got signal to stop process which does not exist.")
    }
  }

  private block(id: string) {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      foundProcess.block()
    } else {
      console.error("Rpc: Got signal to block process which does not exist.")
    }
  }

  private unblock(id: string) {
    const cleanedId = id.trim().toLocaleLowerCase()
    const foundProcess = this.allProcesses().findLast((p) => p.getConfig().id.trim().toLowerCase() === cleanedId)
    if (foundProcess) {
      foundProcess.unblock()
    } else {
      console.error("Rpc: Got signal to unblock process which does not exist.")
    }
  }

  private pluginSignal(signal: string, args: unknown): boolean {
    let result = false
    for (const plugin of this.plugins) {
      if (plugin.impl && plugin.impl.signal) {
        const pluginResult = plugin.impl.signal(signal, args)
        if (pluginResult) result = true
      }
    }
    return result
  }

  private processIpcMessage(message: ValidatedMessage) {
    if (message.data !== null) {
      const parsedMessage = JSON.parse(message.data)
      if (parsedMessage.start) {
        if (parsedMessage.start.trim().toLocaleLowerCase() === "all") {
          for (const process of this.allProcesses()) {
            process.start("ipc")
          }
          // ToDo, also check valid characters
        } else if (parsedMessage.start.length >= 1 && parsedMessage.start.length <= 64) {
          this.start(parsedMessage.start)
        }
      } else if (parsedMessage.stop) {
        if (parsedMessage.stop.trim().toLocaleLowerCase() === "all") {
          for (const process of this.allProcesses()) {
            process.stop("ipc")
          }
          // ToDo, also check valid characters
        } else if (parsedMessage.stop.length >= 1 && parsedMessage.stop.length <= 64) {
          this.stop(parsedMessage.stop)
        }
      } else if (parsedMessage.restart) {
        if (parsedMessage.restart.trim().toLocaleLowerCase() === "all") {
          for (const process of this.allProcesses()) {
            process.restart("ipc")
          }
          // ToDo, also check valid characters
        } else if (parsedMessage.restart.length >= 1 && parsedMessage.restart.length <= 64) {
          this.restart(parsedMessage.restart)
        }
      } else if (parsedMessage.block) {
        if (parsedMessage.block.trim().toLocaleLowerCase() === "all") {
          for (const process of this.allProcesses()) {
            process.block()
          }
          // ToDo, also check valid characters
        } else if (parsedMessage.block.length >= 1 && parsedMessage.block.length <= 64) {
          this.block(parsedMessage.block)
        }
      } else if (parsedMessage.unblock) {
        if (parsedMessage.unblock.trim().toLocaleLowerCase() === "all") {
          for (const process of this.allProcesses()) {
            process.unblock()
          }
          // ToDo, also check valid characters
        } else if (parsedMessage.unblock.length >= 1 && parsedMessage.unblock.length <= 64) {
          this.unblock(parsedMessage.unblock)
        }
      } else if (parsedMessage.terminate) {
        this.terminate(30000)
      }
    }
  }

  private terminate(forceQuitMs: number) {
    this.requestTerminate = true

    this.logger.log("terminate", "Termination requested")

    // ToDo: Log
    for (const process of this.processes) {
      process.block()
      process.stop("terminating")
    }

    // Force quit after 30 seconds
    const timer = setTimeout(() => {
      this.logger.warn("terminate", "Terminating by force")
      Deno.exit(0)
    }, forceQuitMs)

    // Unref force quit timer to allow the process to exit earlier
    Deno.unrefTimer(timer)
  }
}

export { Pup }
export type { GlobalLoggerConfiguration, ProcessConfiguration }
