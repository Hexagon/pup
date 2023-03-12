import { ProcessConfiguration, Pup } from "./pup.ts"
import { readLines } from "../../deps.ts"

type RunnerCallback = (pid: number) => void

class Runner {
  private readonly processConfig: ProcessConfiguration
  private readonly pup: Pup

  private process?: Deno.Process

  constructor(pup: Pup, processConfig: ProcessConfiguration) {
    this.processConfig = processConfig
    this.pup = pup
  }

  private async pipeToLogger(category: string, reader: Deno.Reader) {
    const logger = this.pup.logger

    // Write to log
    try {
      for await (const line of readLines(reader)) {
        if (category === "stderr") {
          logger.error(category, line, this.processConfig)
        } else {
          logger.log(category, line, this.processConfig)
        }
      }
    } catch (_e) {
      logger.error("error", "Pipe error")
    }
  }

  async run(runningCallback: RunnerCallback) {
    // Extend enviroment config with PUP_PROCESS_ID
    const env = this.processConfig.env ? structuredClone(this.processConfig.env) : {}
    env.PUP_PROCESS_ID = this.processConfig.id

    // Start the process
    const process = Deno.run({
      cmd: this.processConfig.cmd,
      cwd: this.processConfig.cwd,
      env,
      stdout: "piped",
      stderr: "piped",
    })
    this.process = process

    runningCallback(process.pid)

    this.pipeToLogger("stdout", process.stdout)
    this.pipeToLogger("stderr", process.stderr)

    const result = await process.status()

    // Important! Close streams
    process.stderr.close()
    process.stdout.close()

    // Exited
    return result
  }

  public kill = (signal: Deno.Signal) => {
    this.process?.kill(signal)
  }
}

export { Runner }
