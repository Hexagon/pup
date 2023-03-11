import { ProcessConfiguration, Pup } from "./pup.ts"

import { readLines } from "../../deps.ts"

class SubProcess {
  private readonly processConfig: ProcessConfiguration
  private readonly pup: Pup

  constructor(pup: Pup, processConfig: ProcessConfiguration) {
    this.processConfig = processConfig
    this.pup = pup
  }

  private async pipeToLogger(category: string, reader: Deno.Reader) {
    const logger = this.pup.logger
    const status = this.pup.status

    let lastStderr, lastStdout
    // Write to log
    try {
      for await (const line of readLines(reader)) {
        if (category === "stderr") {
          lastStderr = line
          logger.error(category, line, this.processConfig)
        } else {
          lastStdout = line
          logger.log(category, line, this.processConfig)
        }
      }
    } catch (_e) {
      logger.error("error", "Pipe error")
    }
    if (lastStderr) status.updateLastStderr(this.processConfig.id, lastStderr)
    if (lastStdout) status.updateLastStdout(this.processConfig.id, lastStdout)
  }

  async run(reason: string) {
    const status = this.pup.status
    const logger = this.pup.logger

    // Extend enviroment config with PUP_PROCESS_NAME
    const env = this.processConfig.env ? structuredClone(this.processConfig.env) : {};
    env.PUP_PROCESS_ID = this.processConfig.id

    // Start the process
    logger.log("starting", `Process starting, reason: ${reason}`, this.processConfig)
    const cat = Deno.run({
      cmd: this.processConfig.cmd,
      cwd: this.processConfig.cwd,
      env,
      stdout: "piped",
      stderr: "piped",
    })

    status.resetTask(this.processConfig.id)
    status.updatePid(this.processConfig.id, cat.pid)
    status.updateStarted(this.processConfig.id, new Date())

    this.pipeToLogger("stdout", cat.stdout);
    this.pipeToLogger("stderr", cat.stderr);

    const result = await cat.status()

    if (result.code > 0) {
      logger.error("finished", `Process finished with error code ${result.code}`, this.processConfig)
    } else {
      logger.log("finished", `Process finished with code ${result.code}`, this.processConfig)
    }

    // Important! Close streams
    cat.stderr.close()
    cat.stdout.close()

    status.updateExitCode(this.processConfig.id, result.code)
    status.updateSignal(this.processConfig.id, result.signal)
    status.updateExited(this.processConfig.id, new Date())

    return result
  }
}

export { SubProcess }
