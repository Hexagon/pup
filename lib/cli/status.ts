import { ProcessInformationParsed, ProcessStatus } from "../core/process.ts"
import { isRunning } from "../common/utils.ts"

/**
 * Helper which print the status of all running processes,
 * including this main process
 *
 * Triggered by supplying `--status` or `-s` as a command
 * line argument
 *
 * @private
 * @async
 */
export async function printStatus(configFile: string) {
  const statusFile = `${configFile}.status`

  let statusData
  try {
    statusData = await Deno.readTextFile(statusFile)
  } catch (_e) {
    console.error(`Could not read status for config file '${configFile}' from '${statusFile}'`)
    Deno.exit(1)
  }

  let status
  try {
    status = JSON.parse(statusData)
  } catch (_e) {
    console.error(`Could not read status for config file '${configFile}' from '${statusFile}'`)
    Deno.exit(1)
  }

  console.log(`\nMain process (Version: ${status.version}, PID: ${status.pid}, ${isRunning(status.pid, new Date(Date.parse(status.updated)), 5000)})`)

  for (const taskInfo of Object.values(status.processes)) {
    const currentTask = taskInfo as ProcessInformationParsed
    const processRunning = currentTask.pid ? isRunning(currentTask.pid, new Date(Date.parse(currentTask.updated)), 30000) : "Not running"
    console.log(`\nTask: ${currentTask.id} (${(currentTask.pid ? ("PID: " + currentTask.pid + ", ") : "")}${processRunning})\n`)
    console.log(`  Started:\t${currentTask.started ? currentTask.started.toLocaleString() : "-"}`)
    console.log(`  Last status:\t${ProcessStatus[currentTask.status] ?? "-"}`)
    console.log(`  Last update:\t${currentTask.updated ?? "-"}`)
    console.log(`  Code:\t\t${currentTask.code ?? "-"}`)
    console.log(`  Signal:\t${currentTask.signal ?? "-"}`)
    console.log(`  Exited:\t${currentTask.exited ? currentTask.exited.toLocaleString() : "-"}`)
  }
  console.log("\n")
}
