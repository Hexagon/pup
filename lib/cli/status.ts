/**
 * Exports functions belonging to --status functionality
 * Belongs to Pup cli entrypoint
 *
 * @file      lib/cli/status.ts
 * @license   MIT
 */

import { ProcessInformationParsed, ProcessStatus } from "../core/process.ts"

interface TaskTableInformation {
  Id: string
  Pid?: number
  Status: string
  Started?: string
  Exited?: string
  Signal: string
}

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
    console.error(`Could not read status for config file '${configFile}' from '${statusFile}', no instance running.`)
    Deno.exit(1)
  }

  let status
  try {
    status = JSON.parse(statusData)
  } catch (_e) {
    console.error(`Could not parse status for config file '${configFile}' from '${statusFile}, invalid file content.'`)
    Deno.exit(1)
  }

  const taskTable: TaskTableInformation[] = []

  // Add main process
  taskTable.push({
    Id: "Main",
    Pid: status.pid,
    Status: status.status,
    Started: status.started,
    Exited: status.exited,
    Signal: `${(status.code ?? "-")}${status.signal ? (" " + status.signal) : ""}`,
  })

  // Add all processes
  for (const taskInfo of Object.values(status.processes)) {
    const currentTask = taskInfo as ProcessInformationParsed
    taskTable.push({
      Id: currentTask.id,
      Pid: currentTask.pid,
      Status: ProcessStatus[currentTask.status],
      Started: currentTask.started,
      Exited: currentTask.exited,
      Signal: `${(currentTask.code ?? "-")}${currentTask.signal ? (" " + currentTask.signal) : ""}`,
    })
  }
  console.table(taskTable)
}
