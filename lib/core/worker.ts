/**
 * Class that run tasks as web workers
 *
 * @file      lib/core/worker.ts
 * @license   MIT
 */

import type { ProcessConfiguration, Pup } from "./pup.ts"
import { readLines, StringReader } from "@std/io"
import { resolve } from "@std/path"
import { BaseRunner, type RunnerCallback, type RunnerResult } from "../types/runner.ts"

class WorkerRunner extends BaseRunner {
  private worker?: Worker

  constructor(pup: Pup, processConfig: ProcessConfiguration) {
    super(pup, processConfig)
  }

  /**
   * Runs the worker with the provided configuration.
   *
   * @param runningCallback Callback function to be called when the worker is running.
   * @returns RunnerResult object indicating the result of the worker run.
   */
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

  /**
   * Runs the worker with the provided configuration.
   *
   * @param runningCallback Callback function to be called when the worker is running.
   * @returns RunnerResult object indicating the result of the worker run.
   */
  public async run(runningCallback: RunnerCallback): Promise<RunnerResult> {
    if (!this.processConfig.worker) {
      throw new Error("No worker specified")
    }

    const env = this.processConfig.env ? structuredClone(this.processConfig.env) : {}
    env.PUP_PROCESS_ID = this.processConfig.id
    if (this.pup.temporaryStoragePath) env.PUP_TEMP_STORAGE = this.pup.temporaryStoragePath
    if (this.pup.persistentStoragePath) env.PUP_DATA_STORAGE = this.pup.persistentStoragePath

    const workingDir = this.processConfig.cwd || Deno.cwd()
    const workingDirUrl = new URL(`file://${resolve(workingDir)}/`).href

    try {
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
    } catch (error) {
      this.pup.logger.error("error", `Fatal worker error: ${error.message}`, this.processConfig)
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

  /**
   * Aborts the running process.
   *
   * @param _signal The signal to use when killing the process.
   */
  public kill(_signal?: Deno.Signal) {
    try {
      this.worker?.terminate() // Note: the abort method does not accept a signal parameter.
    } catch (_e) {
      // Ignore
    }
  }
}

export { WorkerRunner }
