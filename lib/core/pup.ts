import { Configuration, GlobalLoggerConfiguration, ProcessConfiguration, validateConfiguration } from "./configuration.ts"
import { Logger } from "./logger.ts"
import { Process, ProcessStatus } from "./process.ts"
import { Status } from "./status.ts"

class Pup {
  public configuration: Configuration
  public logger: Logger
  public status: Status

  public processes: Process[] = []

  constructor(unvalidatedConfiguration: unknown, statusFile?: string) {
    // Throw on invalid configuration
    this.configuration = validateConfiguration(unvalidatedConfiguration)

    // Initialise core logger
    this.logger = new Logger(this.configuration.logger ?? {})

    // Initialise status tracker
    this.status = new Status(statusFile)

    // Create processes
    if (this.configuration.processes) {
      for (const process of this.configuration.processes) {
        const newProcess = new Process(this, process)
        this.processes.push(newProcess)
      }
    }
  }

  public start = () => {
    for (const process of this.processes) {
      process.init()
    }
    this.watchdog()
  }

  private watchdog = () => {
    // Wrap watchdog operation in a catch to prevent it from ever stopping
    try {
      // Loop through all processes, checking if some actions are needed
      for (const process of this.processes) {
        const status = process.getStatus()
        const config = process.getConfig()

        // Handle initial starts
        if (config.autostart && status.status === ProcessStatus.CREATED) {
          process.start("Autostart")
        }

        // Handle restarts
        if (status.status === ProcessStatus.FINISHED || status.status === ProcessStatus.ERRORED) {
          // Handle max restart policy
          const msSinceExited = status.exited ? (new Date().getTime() - status.exited?.getTime()) : Infinity
          const restartDelay = config.restartDelayMs ?? 10000
          const restartPolicy = config.restart ?? "always"
          if (restartPolicy === "always" && msSinceExited > restartDelay) {
            process.start("restart", true)
          } else if (restartPolicy === "error" && ProcessStatus.ERRORED) {
            process.start("restart", true)
          }
        }

        // Handle timeouts
        if (status.status === ProcessStatus.RUNNING && config.timeout && status.started) {
          const secondsSinceStart = (new Date().getTime() - status.started.getTime()) / 1000
          if (secondsSinceStart > config.timeout) {
            process.stop("Timeout")
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

    // Reschedule watchdog
    // ToDo: Exit if all processes are exhausted?
    setTimeout(() => {
      this.watchdog()
    }, 2000)
  }
}

export { Pup }
export type { GlobalLoggerConfiguration, ProcessConfiguration }
