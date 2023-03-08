import { readLines } from "../deps.ts"
import { ProcessConfiguration } from "./pup.ts"
import { Logger } from "./logger.ts"
import { Configuration } from "./configuration.ts"

async function pipeToLogger(
  logger: Logger,
  category: string,
  reader: Deno.Reader,
) {
  for await (const line of readLines(reader)) {
    if (category === "stderr") {
      logger.error(category, line)
    } else {
      logger.log(category, line)
    }
  }
}

async function createSubprocess(globalConfig: Configuration, processConfig: ProcessConfiguration) {
  const logger = new Logger(globalConfig.logger)
  logger.setProcess(processConfig)

  const cat = Deno.run({
    cmd: processConfig.cmd,
    cwd: processConfig.cwd,
    stdout: "piped",
    stderr: "piped",
  })

  pipeToLogger(logger, "stdout", cat.stdout)
  pipeToLogger(logger, "stderr", cat.stderr)

  const status = await cat.status()

  cat.stderr.close()
  cat.stdout.close()

  return status
}

export { createSubprocess }
