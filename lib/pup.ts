import { createSubprocess } from "./subprocess.ts"
import { Cron } from "../deps.ts"
import { Logger } from "./logger.ts"
import { Configuration, ProcessConfiguration, validateConfiguration } from "./configuration.ts"
import * as procStatus from "./status.ts";

class Pup {

  private configuration : Configuration
  private logger : Logger

  constructor(unvalidatedConfiguration: Configuration, configFile?: string) {

    // Throw on invalid configuration
    this.configuration = validateConfiguration(unvalidatedConfiguration);

    // Initialise core logger
    this.logger = new Logger(this.configuration.logger);

    // Set status file name
    procStatus.setFileName(configFile ? configFile + ".status" : undefined)

    if (this.configuration.processes) for (const process of this.configuration.processes) {
      // Start using cron pattern
      if (process.startPattern) this.#startCronSubprocess(process)
      // Start instantly
      if (process.autostart) this.#autostartSubprocess(process)
    }

  }

  #startCronSubprocess = (processConfig: ProcessConfiguration) => {
    new Cron(processConfig.startPattern as string, async () => {
      this.logger.log("starting", `Process started on cron pattern '${processConfig.startPattern}'`)
      const code = await createSubprocess(this.configuration, processConfig)
      this.logger.log("finished", `Process finished with code ${code.code}`)
    })
    this.logger.log("scheduled", `Process scheduled using cron pattern '${processConfig.startPattern}'`)
  }

  #autostartSubprocess = async (processConfig: ProcessConfiguration) => {
    this.logger.log("starting", `Process autostarting`)
    const code = await createSubprocess(this.configuration, processConfig)
    this.logger.log("finished", `Process finished with code ${code.code}`)
    if (processConfig.restart === "always") {
      const delay = processConfig.restartDelayMs || 10000
      this.logger.log("scheduled", `Process scheduled to auto restart after ${delay}`)
      setTimeout(() => this.#autostartSubprocess(processConfig), delay)
    }
  }

}

export { Pup }
export type { ProcessConfiguration }
