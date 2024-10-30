/**
 * Class that run tasks as regular processes using Dax
 *
 * @file      lib/core/runner.ts
 * @license   MIT
 */

import type { ProcessConfiguration, Pup } from "./pup.ts"
import { readLines, StringReader } from "@std/io"
import { BaseRunner, type RunnerCallback, type RunnerResult } from "../types/runner.ts"
import { $, type CommandChild } from "dax-sh"
import { getAllEnv } from "@cross/env"
import { deepMerge } from "@cross/deepmerge"
import { CurrentOS, OperatingSystem } from "@cross/runtime"
import { GenerateToken } from "../common/token.ts"
import { DEFAULT_REST_API_HOSTNAME } from "./configuration.ts"

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

    const env = await this.createEnvironmentConfig()
    const child = this.prepareCommand(env)

    this.process = child.spawn()

    runningCallback()

    this.pipeToLogger("stdout", this.process.stdout() as ReadableStream<Uint8Array>)
    this.pipeToLogger("stderr", this.process.stderr() as ReadableStream<Uint8Array>)

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
      // @ts-ignore Wierd complaint about "SIGPOLL"
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
  private async createEnvironmentConfig(): Promise<Record<string, string | undefined>> {
    // Start with current environment
    let env = getAllEnv() || {}

    // Transfer environment variables from process config .env
    if (this.processConfig.env) {
      env = deepMerge(env, this.processConfig.env)
    }

    // Append/overwrite
    // - PUP_PROCESS_ID
    env.PUP_PROCESS_ID = this.processConfig.id
    // - PUP_TEMP_STORAGE
    if (this.pup.temporaryStoragePath) env.PUP_TEMP_STORAGE = this.pup.temporaryStoragePath
    // - PUP_DATA_STORAGE
    if (this.pup.persistentStoragePath) env.PUP_DATA_STORAGE = this.pup.persistentStoragePath
    // - PUP_API_HOSTNAME
    env.PUP_API_HOSTNAME = this.pup.configuration.api?.hostname || DEFAULT_REST_API_HOSTNAME
    // - PUP_API_PORT
    if (this.pup.port?.load()) env.PUP_API_PORT = this.pup.port.fromCache()!
    // - PUP_API_TOKEN
    if (this.pup.secret?.load()) {
      env.PUP_API_TOKEN = await GenerateToken(await this.pup.secret?.load(), { consumer: "telemetry-" + this.processConfig.id }, new Date().getTime() + (365 * 24 * 60 * 60 * 1000))
    }

    // Transfer path from process config if specified
    if (this.processConfig.path) {
      const paths = []
      if (env.PATH) {
        paths.push(env.PATH)
      }
      if (this.processConfig.path) {
        paths.push(this.processConfig.path)
      }
      if (paths.length > 0) {
        // Use ; as path separator in Windows, : in others
        const pathSeparator = CurrentOS === OperatingSystem.Windows ? ";" : ":"
        env.PATH = paths.join(pathSeparator)
      }
    }

    return env
  }

  /**
   * Prepares the command to be executed based on the process configuration.
   *
   * @param env The environment configuration for the command.
   * @returns The command to be executed.
   */
  private prepareCommand(env?: Record<string, string | undefined>) {
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
      if (e instanceof Error && e.message.includes("124")) {
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
