import { readLines } from "https://deno.land/std@0.104.0/io/mod.ts";
import { writeAll } from "https://deno.land/std@0.104.0/io/util.ts";
import { ProcessConfiguration } from "./pup.ts";
import { logger } from "./result.ts";

async function pipeThrough(
  prefix: string,
  category: string,
  reader: Deno.Reader,
  writer: Deno.Writer,
) {
  const encoder = new TextEncoder();
  for await (const line of readLines(reader)) {
    await writeAll(writer, encoder.encode(logger(prefix, category, line) + "\n"));
  }
}

async function createSubprocess(processConfig: ProcessConfiguration) {
  const cat = Deno.run({
    cmd: processConfig.cmd,
    cwd: processConfig.cwd,
    stdout: "piped",
    stderr: "piped",
  })

  pipeThrough(processConfig.name, "stdout", cat.stdout, Deno.stdout);
  pipeThrough(processConfig.name, "stderr",  cat.stderr, Deno.stderr);

  const status = await cat.status()

  //cat.stderr.close()
  //cat.stdout.close()

  return status
}

export { createSubprocess }
