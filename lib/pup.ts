import { createSubprocess } from "./subprocess.ts"
import { Cron } from "../deps.ts"
import { logger } from "./logger.ts"

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
    logger("log", "core", "starting", `Process started on cron pattern '${processConfig.startPattern}'`)
    const code = await createSubprocess(processConfig)
    logger("log", "core", "finished", `Process finished with code ${code.code}`)
  })
  logger("log", "core", "scheduled", `Process scheduled using cron pattern '${processConfig.startPattern}'`)
}

async function autostartSubprocess(processConfig: ProcessConfiguration) {
  logger("log", "core", "starting", `Process autostarting`)
  const code = await createSubprocess(processConfig)
  logger("log", "core", "finished", `Process finished with code ${code.code}`)
  if (processConfig.restart === "always") {
    const delay = processConfig.restartDelayMs || 10000
    logger("log", "core", "scheduled", `Process scheduled to auto restart after ${delay}`)
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
