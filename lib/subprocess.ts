import { readLines } from "../deps.ts"
import { ProcessConfiguration } from "./pup.ts"
import { Logger } from "./logger.ts"
import { Configuration } from "./configuration.ts"
import * as procStatus from "./status.ts";

async function pipeToLogger(
  taskName: string,
  logger: Logger,
  category: string,
  reader: Deno.Reader,
) {
  let lastStderr, lastStdout;
  // Write to log
  try {
    for await (const line of readLines(reader)) {
      if (category === "stderr") {
        lastStderr = line;
        logger.error(category, line)
      } else {
        lastStdout = line;
        logger.log(category, line)
      }
    }
  } catch (_e) { logger.error("core", "Pipe error")}
  if (lastStderr) procStatus.updateLastStderr(taskName, lastStderr)
  if (lastStdout) procStatus.updateLastStdout(taskName, lastStdout)
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

  procStatus.updatePid(processConfig.name, cat.pid)
  procStatus.updateStarted(processConfig.name, new Date())

  pipeToLogger(processConfig.name, logger, "stdout", cat.stdout)
  pipeToLogger(processConfig.name, logger, "stderr", cat.stderr)

  const status = await cat.status()

  cat.stderr.close()
  cat.stdout.close()

  procStatus.updateExitCode(processConfig.name, status.code)
  procStatus.updateSignal(processConfig.name, status.signal)
  procStatus.updateExited(processConfig.name, new Date())

  return status
}

export { createSubprocess }
