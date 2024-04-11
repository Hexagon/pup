/**
 * Class that run tasks as regular processes using Dax
 *
 * @file      lib/core/runner.ts
 * @license   MIT
 */

import { ProcessConfiguration, Pup } from "./pup.ts"
import { readLines, StringReader } from "@std/io"
import { BaseRunner, RunnerCallback, RunnerResult } from "../types/runner.ts"
import { $, CommandChild } from "dax-sh"
/**
 * Represents a task runner that executes tasks as regular processes.
 * Extends the BaseRunner class.
 */
class Runner extends BaseRunner {
  private process?: CommandChild

  constructor(pup: Pup, processConfig: ProcessConfiguration) {
    super(pup, processConfig)
  }

  /**
   * Executes the command specified in the process configuration.
   *
   * @param runningCallback The callback to be called once the process starts running.
   * @returns The result of the running process.
   */
  public async run(runningCallback: RunnerCallback): Promise<RunnerResult> {
    if (!this.processConfig.cmd) {
      throw new Error("No command specified")
    }

    const env = this.createEnvironmentConfig()
    const child = this.prepareCommand(env)

    this.process = child.spawn()

    runningCallback()

    this.pipeToLogger("stdout", this.process.stdout())
    this.pipeToLogger("stderr", this.process.stderr())

    const result = await this.waitForProcessEnd()

    this.process = undefined

    // Create a RunnerResult
    const runnerResult: RunnerResult = {
      code: result?.code,
      signal: null, // Signal not available in the dax CommandChild
      success: result?.code === 0 ? true : false,
    }

    return runnerResult
  }

  /**
   * Aborts the running process.
   *
   * @param signal The signal to use when killing the process.
   */
  public kill(signal: Deno.Signal = "SIGTERM") {
    try {
      this.process?.kill(signal)
    } catch (_e) {
      // Ignore
    }
  }

  /**
   * Pipes the output of the running process to the logger.
   *
   * @param category The category of the output (stdout/stderr).
   * @param reader The stream to read the output from.
   */
  private async pipeToLogger(category: string, reader: ReadableStream<Uint8Array>) {
    const logger = this.pup.logger

    try {
      for await (const chunk of reader) {
        const r = new StringReader(new TextDecoder().decode(chunk))
        for await (const line of readLines(r)) {
          if (category === "stderr") {
            await logger.error(category, line, this.processConfig)
          } else {
            await logger.log(category, line, this.processConfig)
          }
        }
      }
    } catch (_e) {
      /* Ignore, error message will be caught by the master process */
    }
  }

  /**
   * Creates the environment configuration for the process.
   *
   * @returns The environment configuration.
   */
  private createEnvironmentConfig() {
    const env = this.processConfig.env ? structuredClone(this.processConfig.env) : {}
    env.PUP_PROCESS_ID = this.processConfig.id

    if (this.pup.temporaryStoragePath) env.PUP_TEMP_STORAGE = this.pup.temporaryStoragePath
    if (this.pup.persistentStoragePath) env.PUP_DATA_STORAGE = this.pup.persistentStoragePath

    this.extendPath()

    return env
  }

  /**
   * Extends the PATH environment variable with the path specified in the process configuration.
   */
  private extendPath() {
    if (this.processConfig.path) {
      if (Deno.env.has("PATH")) {
        Deno.env.set("PATH", `${Deno.env.get("PATH")}:${this.processConfig.path}`)
      } else {
        Deno.env.set("PATH", `${this.processConfig.path}`)
      }
    }
  }

  /**
   * Prepares the command to be executed based on the process configuration.
   *
   * @param env The environment configuration for the command.
   * @returns The command to be executed.
   */
  private prepareCommand(env: Record<string, string>) {
    let child = $.raw`${this.processConfig.cmd!}`.stdout("piped").stderr("piped")
    if (this.processConfig.cwd) child = child.cwd(this.processConfig.cwd)
    if (env) child = child.env(env)

    return child
  }

  /**
   * Waits for the process to end and catches any errors that might occur.
   *
   * @returns The result of the process.
   */
  private async waitForProcessEnd() {
    let result
    try {
      result = await this.process
    } catch (e) {
      if (e.message.includes("124")) {
        result = {
          code: 124,
          signal: null,
          success: false,
        }
      } else {
        throw e
      }
    }

    return result
  }
}

export { Runner }
