import { SubProcess } from "./subprocess.ts"
import { Cron } from "../../deps.ts"
import { Logger } from "./logger.ts"
import { Configuration, GlobalLoggerConfiguration, ProcessConfiguration, validateConfiguration } from "./configuration.ts"
import { Status } from "./status.ts"

class Pup {
  public configuration: Configuration
  public logger: Logger
  public status: Status

  constructor(unvalidatedConfiguration: unknown, statusFile?: string) {
    // Throw on invalid configuration
    this.configuration = validateConfiguration(unvalidatedConfiguration)

    // Initialise core logger
    this.logger = new Logger(this.configuration.logger ?? {})

    // Initialize status tracker
    this.status = new Status(statusFile)
  }

  public start = () => {
    // Start processses
    if (this.configuration.processes) {
      for (const process of this.configuration.processes) {
        // Start using cron pattern
        if (process.startPattern) this.startCronSubprocess(process)
        // Start instantly
        if (process.autostart) this.autostartSubprocess(process)
      }
    }

    // Start heartbeat
    this.heartbeat()
  }

  private heartbeat = () => {
    this.status.updateHeartBeat()
    setTimeout(() => {
      this.heartbeat()
    }, 5000)
  }

  private startCronSubprocess = (processConfig: ProcessConfiguration) => {
    const cronJob = new Cron(processConfig.startPattern as string, async () => {
      // We await this so that croner can keep track of overruns
      await (new SubProcess(this, processConfig)).run("Cron trigger")

      // And so that we can write next run time after the process finishes
      this.logger.log("scheduled", `Process scheduled to run at '${cronJob.nextRun()?.toLocaleString()}' using cron pattern '${processConfig.startPattern}'`)
    })

    // Initial next run time
    this.logger.log("scheduled", `Process scheduled to run at '${cronJob.nextRun()?.toLocaleString()}' using cron pattern '${processConfig.startPattern}'`)
  }

  private autostartSubprocess = async (processConfig: ProcessConfiguration, restart?: boolean) => {
    await (new SubProcess(this, processConfig)).run(restart ? "Autostart" : "Restart")
    if (processConfig.restart === "always") {
      const delay = processConfig.restartDelayMs || 10000
      this.logger.log("scheduled", `Process scheduled to restart after ${delay} ms`)
      setTimeout(() => this.autostartSubprocess(processConfig), delay)
    }
  }
}

export { Pup }
export type { GlobalLoggerConfiguration, ProcessConfiguration }
