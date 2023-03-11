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
        if (process.cron) this.startCronSubprocess(process)
        // Start instantly
        if (process.autostart) this.autostartSubprocess(process)
      }
    }

    // Start heartbeat
    this.heartbeat()
  }

  private heartbeat = () => {

    this.status.updateHeartBeat()

    const heartBeatTimer = setTimeout(() => {
      this.heartbeat()
    }, 5000)

    // Do not block main process
    Deno.unrefTimer(heartBeatTimer);
  }

  private startCronSubprocess = (processConfig: ProcessConfiguration) => {
    const cronJob = new Cron(processConfig.cron as string, async () => {
      // We await this so that croner can keep track of overruns
      await (new SubProcess(this, processConfig)).run("Cron trigger")

      // And so that we can write next run time after the process finishes
      this.logger.log("scheduler", `${processConfig.name} is scheduled to run at '${processConfig.cron} (${cronJob.nextRun()?.toLocaleString()})'`)
    })

    // Initial next run time
    this.logger.log("scheduler", `${processConfig.name} is scheduled to run at '${processConfig.cron} (${cronJob.nextRun()?.toLocaleString()})'`)
  }

  private autostartSubprocess = async (processConfig: ProcessConfiguration, restart?: number) => {

    // Evaluate restarts

    // Run subprocess and await result
    const result = await (new SubProcess(this, processConfig)).run(restart ? "Autostart" : "Restart")

    // Check conditions to restart
    if (processConfig.restart === "always" || (result.code > 0 && processConfig.restart=== "error")) {

      const delay = processConfig.restartDelayMs || 10000
      const maxRestarts = processConfig.maxRestarts ?? Infinity
      const currentRestarts = (restart ?? 0) + 1
      const restartText = (processConfig.maxRestarts !== undefined) ? `, restart ${currentRestarts} of ${maxRestarts}` : ""

      // Go ahead restarting
      if (currentRestarts <= maxRestarts) {
        this.logger.log("scheduler", `${processConfig.name} is scheduled to restart in ${delay} ms${restartText}`)
        setTimeout(() => this.autostartSubprocess(processConfig, currentRestarts), delay)
      } else {
        this.logger.log("scheduler", `${processConfig.name} has exceeded the maximum number of restarts (${maxRestarts}) and will exit`)
      }
    }
  }
}

export { Pup }
export type { GlobalLoggerConfiguration, ProcessConfiguration }
