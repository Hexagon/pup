import { readLines } from "https://deno.land/std@0.104.0/io/mod.ts";
import { ProcessConfiguration } from "./pup.ts";
import { logger } from "./logger.ts";

async function pipeToLogger(
  prefix: string,
  category: string,
  reader: Deno.Reader
) {
  for await (const line of readLines(reader)) {
    logger("log",prefix, category, line);
  }
}

async function createSubprocess(processConfig: ProcessConfiguration) {
  const cat = Deno.run({
    cmd: processConfig.cmd,
    cwd: processConfig.cwd,
    stdout: "piped",
    stderr: "piped",
  })

  pipeToLogger(processConfig.name, "stdout", cat.stdout);
  pipeToLogger(processConfig.name, "stderr",  cat.stderr);

  const status = await cat.status()

  cat.stderr.close()
  cat.stdout.close()

  return status
}

export { createSubprocess }
