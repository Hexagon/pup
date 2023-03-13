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

  private async writePidFile() {
    if (this.processConfig.pidFile && this.process?.pid) {
      try {
        await Deno.writeTextFile(this.processConfig.pidFile, this.process?.pid.toString())
      } catch (_e) {
        this.pup.logger.error("error", `Failed to write pid file '${this.processConfig.pidFile}'`, this.processConfig)
      }
    }
  }

  private async removePidFile() {
    if (this.processConfig.pidFile) {
      try {
        // Make sure pid file exists
        const fileInfo = await Deno.stat(this.processConfig.pidFile)

        // First check that the pid file is actually a file, then try to delete
        if (fileInfo.isFile) {
          await Deno.remove(this.processConfig.pidFile, { recursive: false })
        }
      } catch (_e) {
        this.pup.logger.error("error", `Failed to remove pid file '${this.processConfig.pidFile}', file will be left on the filesystem.`, this.processConfig)
      }
    }
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

    // Process started, report pid to callback and file
    runningCallback(process.pid)
    this.writePidFile()

    this.pipeToLogger("stdout", process.stdout)
    this.pipeToLogger("stderr", process.stderr)

    // Wait for process to stop and retrieve exit status
    const result = await process.status()

    // Important! Close streams
    process.stderr.close()
    process.stdout.close()

    // ... and clean up the pid file
    this.removePidFile()

    return result
  }

  public kill = (signal: Deno.Signal) => {
    this.process?.kill(signal)
  }
}

export { Runner }
