import { ProcessConfiguration, Pup } from "./pup.ts"
import { $, CommandChild, readLines, StringReader } from "../../deps.ts"

import { BaseRunner, RunnerCallback, RunnerResult } from "../types/runner.ts"

class Runner extends BaseRunner {
  private process?: CommandChild

  constructor(pup: Pup, processConfig: ProcessConfiguration) {
    super(pup, processConfig)
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

    // Optimally, every item of this.processConfig.cmd should be escaped
    let child = $.raw`${this.processConfig.cmd}`.stdout("piped").stderr("piped")
    if (this.processConfig.cwd) child = child.cwd(this.processConfig.cwd)
    if (env) child = child.env(env)

    // Spawn the process
    this.process = child.spawn()

    runningCallback() // PID should be passed as an argument if available

    this.pipeToLogger("stdout", this.process.stdout())
    this.pipeToLogger("stderr", this.process.stderr())

    // Dax will throw on abort, handle that explicitly
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

    this.process = undefined

    // ToDo: Is it possible to ref the process?

    // Create a RunnerResult
    const runnerResult: RunnerResult = {
      code: result.code,
      signal: null, // Signal not available in the dax CommandChild
      success: result.code === 0 ? true : false,
    }

    return runnerResult
  }

  public kill = () => {
    try {
      this.process?.abort()
    } catch (_e) {
      // Ignore
    }
  }
}

export { Runner }
