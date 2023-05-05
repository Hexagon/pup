import { ProcessConfiguration, Pup } from "./pup.ts"
import { readLines, StringReader } from "../../deps.ts"

import { BaseRunner, RunnerCallback, RunnerResult } from "../types/runner.ts"

class Runner extends BaseRunner {
  private process?: Deno.ChildProcess

  constructor(pup: Pup, processConfig: ProcessConfiguration) {
    super(pup, processConfig)
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
      } catch (e) {
        this.pup.logger.error("error", `Failed to remove pid file '${this.processConfig.pidFile}', file will be left on the filesystem. Error: ${e.message}`, this.processConfig)
      }
    }
  }

  private async pipeToLogger(category: string, reader: ReadableStream<Uint8Array>) {
    const logger = this.pup.logger

    // Write to log
    try {
      for await (const chunk of reader) {
        const r = new StringReader(new TextDecoder().decode(chunk))
        for await (const line of readLines(r)) {
          if (category === "stderr") {
            logger.error(category, line, this.processConfig)
          } else {
            logger.log(category, line, this.processConfig)
          }
        }
      }
    } catch (_e) {
      logger.error("error", "Pipe error")
    }
  }

  async run(runningCallback: RunnerCallback) {
    if (!this.processConfig.cmd) {
      throw new Error("No command specified")
    }

    // Extend enviroment config with PUP_PROCESS_ID
    const env = this.processConfig.env ? structuredClone(this.processConfig.env) : {}
    env.PUP_PROCESS_ID = this.processConfig.id
    if (this.pup.temporaryStoragePath) env.PUP_TEMP_STORAGE = this.pup.temporaryStoragePath
    if (this.pup.persistentStoragePath) env.PUP_DATA_STORAGE = this.pup.persistentStoragePath

    // Extend path (if specified)
    if (this.processConfig.path) {
      if (Deno.env.has("PATH")) {
        Deno.env.set("PATH", `${Deno.env.get("PATH")}:${this.processConfig.path}`)
      } else {
        Deno.env.set("PATH", `${this.processConfig.path}`)
      }
    }

    // Start the process
    const commander = new Deno.Command(
      this.processConfig.cmd[0],
      {
        args: this.processConfig.cmd.slice(1),
        cwd: this.processConfig.cwd,
        env: env,
        stdout: "piped",
        stderr: "piped",
      },
    )

    this.process = commander.spawn()
    this.process.ref()

    // Process started, report pid to callback and file
    runningCallback(this.process.pid)

    this.writePidFile()

    this.pipeToLogger("stdout", this.process.stdout)
    this.pipeToLogger("stderr", this.process.stderr)

    // Wait for process to stop and retrieve exit status
    const result = await this.process.status

    // Important! Close streams

    // ... and clean up the pid file
    this.removePidFile()

    // Create a RunnerResult
    const runnerResult: RunnerResult = {
      code: result.code,
      signal: result.signal,
      success: result.success,
    }

    return runnerResult
  }

  public kill = (signal?: Deno.Signal) => {
    this.process?.kill(signal)
  }
}

export { Runner }
