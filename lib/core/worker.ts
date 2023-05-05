import { ProcessConfiguration, Pup } from "./pup.ts"
import { path, readLines, StringReader } from "../../deps.ts"
import { BaseRunner, RunnerCallback, RunnerResult } from "../types/runner.ts"

class WorkerRunner extends BaseRunner {
  private worker?: Worker

  constructor(pup: Pup, processConfig: ProcessConfiguration) {
    super(pup, processConfig)
  }

  private async pipeToLogger(category: string, message: string) {
    const logger = this.pup.logger
    try {
      const r = new StringReader(message)
      for await (const line of readLines(r)) {
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

  async run(runningCallback: RunnerCallback): Promise<RunnerResult> {
    if (!this.processConfig.worker) {
      throw new Error("No worker specified")
    }

    const env = this.processConfig.env ? structuredClone(this.processConfig.env) : {}
    env.PUP_PROCESS_ID = this.processConfig.id
    if (this.pup.temporaryStoragePath) env.PUP_TEMP_STORAGE = this.pup.temporaryStoragePath
    if (this.pup.persistentStoragePath) env.PUP_DATA_STORAGE = this.pup.persistentStoragePath

    const workingDir = this.processConfig.cwd || Deno.cwd()
    const workingDirUrl = new URL(`file://${path.resolve(workingDir)}/`).href

    this.worker = new Worker(
      new URL(this.processConfig.worker[0], workingDirUrl).href,
      { type: "module", name: this.processConfig.id },
    )

    runningCallback()

    this.worker.postMessage({
      run: this.processConfig.worker.slice(1),
      cmd: this.processConfig.cmd,
      cwd: this.processConfig.cwd,
      env: env,
    })

    this.worker.onmessageerror = (error) => {
      this.pup.logger.error("error", `Worker message error: ${error}`, this.processConfig)
    }

    this.worker.onerror = (error) => {
      this.pup.logger.error("error", `Worker error: ${error.message}`, this.processConfig)
    }

    return await new Promise((resolve) => {
      if (!this.worker) throw new Error("No worker")

      // All messages from the worker are handled here
      this.worker.onmessage = (event) => {
        if (event.data.type === "exit") {
          // Create a RunnerResult
          const runnerResult: RunnerResult = {
            code: event.data.code,
            signal: event.data.signal,
            success: event.data.success,
          }
          resolve(runnerResult)
          this.worker?.terminate()
        } else if (event.data.type === "stdout") {
          this.pipeToLogger("stdout", event.data.message)
        } else if (event.data.type === "stderr") {
          this.pipeToLogger("stderr", event.data.message)
        }
      }
    })
  }

  public kill = () => {
    this.worker?.terminate()
  }
}

export { WorkerRunner }
