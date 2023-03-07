import { createSubprocess } from "./subprocess.ts"
import { Cron } from "../deps.ts"
import { logger } from "./result.ts"

interface ProcessConfiguration {
  name: string
  cmd: string[]
  cwd?: string
  autostart?: boolean
  startPattern?: string
  restart?: string
  restartDelayMs?: number
}

function cronSubprocess(processConfig: ProcessConfiguration) {
  new Cron(processConfig.startPattern as string, async () => {
    console.log(logger(`${processConfig.name}`, "starting", `Process started accoring to cron pattern '${processConfig.startPattern}'`));
    const code = await createSubprocess(processConfig)
    console.log(logger(`${processConfig.name}`, "finished", `Process finished with code ${code.code}`));
  })
  console.log(logger(`${processConfig.name}`, "scheduled", `Process scheduled using cron pattern '${processConfig.startPattern}'`));
}

async function autostartSubprocess(processConfig: ProcessConfiguration) {
  console.log(logger(`${processConfig.name}`, "starting", `Process autostarting`));
  const code = await createSubprocess(processConfig)
  console.log(logger(`${processConfig.name}`, "finished", `Process finished with code ${code.code}`));
  if (processConfig.restart === "always") {
    const delay = processConfig.restartDelayMs || 10000
    console.log(logger(`${processConfig.name}`, "scheduled", `Process scheduled to auto restart after ${delay}`));
    setTimeout(() => autostartSubprocess(processConfig), delay)
  }
}

function pup(config: ProcessConfiguration[]) {
  for (const process of config) {
    // Start using cron pattern
    if (process.startPattern) cronSubprocess(process)
    // Start instantly
    if (process.autostart) autostartSubprocess(process)
  }
}

export { pup }
export type { ProcessConfiguration }
