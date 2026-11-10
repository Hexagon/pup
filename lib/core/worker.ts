/**
 * Class that run tasks as web workers
 *
 * @file      lib/core/worker.ts
 * @license   MIT
 */

import type { ProcessConfiguration, Pup } from "./pup.ts"
import { TextLineStream } from "@std/streams"
import { resolve } from "@std/path"
import { BaseRunner, type RunnerCallback, type RunnerResult } from "../types/runner.ts"
import { cwd } from "@cross/fs"

class WorkerRunner extends BaseRunner {
  private worker?: Worker
  private resolveRun?: (result: RunnerResult) => void

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
      const stream = ReadableStream.from([message])
        .pipeThrough(new TextLineStream())

      for await (const line of stream) {
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

    const workingDir = this.processConfig.cwd || cwd()
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
        this.pup.logger.error("error", `Worker message error: ${error instanceof Error ? error.message : "Unknown"}`, this.processConfig)
      }
    } catch (error) {
      this.pup.logger.error("error", `Fatal worker error: ${error instanceof Error ? error.message : "Unknown"}`, this.processConfig)
    }

    return await new Promise((resolve) => {
      if (!this.worker) throw new Error("No worker")

      // Make sure the run promise settles exactly once, whatever ends the worker
      let settled = false
      this.resolveRun = (result: RunnerResult) => {
        if (settled) return
        settled = true
        this.resolveRun = undefined
        try {
          this.worker?.terminate()
        } catch (_e) {
          // Ignore
        }
        resolve(result)
      }

      // An uncaught error inside the worker ends it, report as errored
      this.worker.onerror = (error) => {
        this.pup.logger.error("error", `Worker error: ${error.message ?? "Unknown"}`, this.processConfig)
        error.preventDefault()
        this.resolveRun?.({ code: 1, signal: null, success: false })
      }

      // All messages from the worker are handled here
      this.worker.onmessage = (event) => {
        if (event.data.type === "exit") {
          this.resolveRun?.({
            code: event.data.code,
            signal: event.data.signal,
            success: event.data.success,
          })
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
    // Workers can not receive signals, terminate and report as manually stopped (code 124)
    // so that the pending run() resolves and the process can transition out of STOPPING
    if (this.resolveRun) {
      this.resolveRun({ code: 124, signal: null, success: false })
    } else {
      try {
        this.worker?.terminate()
      } catch (_e) {
        // Ignore
      }
    }
  }
}

export { WorkerRunner }
