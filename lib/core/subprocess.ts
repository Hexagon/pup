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
    if (lastStderr) status.updateLastStderr(this.processConfig.name, lastStderr)
    if (lastStdout) status.updateLastStdout(this.processConfig.name, lastStdout)
  }

  async run(reason: string) {
    const status = this.pup.status
    const logger = this.pup.logger

    logger.log("starting", `Process starting, reason: ${reason}`, this.processConfig)

    const cat = Deno.run({
      cmd: this.processConfig.cmd,
      cwd: this.processConfig.cwd,
      env: this.processConfig.env,
      stdout: "piped",
      stderr: "piped",
    })

    status.resetTask(this.processConfig.name)
    status.updatePid(this.processConfig.name, cat.pid)
    status.updateStarted(this.processConfig.name, new Date())

    await Promise.all([
      this.pipeToLogger("stdout", cat.stdout),
      this.pipeToLogger("stderr", cat.stderr),
    ])

    const result = await cat.status()

    if (result.code > 0) {
      logger.error("finished", `Process finished with error code ${result.code}`, this.processConfig)
    } else {
      logger.log("finished", `Process finished with code ${result.code}`, this.processConfig)
    }

    cat.stderr.close()
    cat.stdout.close()

    status.updateExitCode(this.processConfig.name, result.code)
    status.updateSignal(this.processConfig.name, result.signal)
    status.updateExited(this.processConfig.name, new Date())

    return result
  }
}

export { SubProcess }
