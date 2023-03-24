/**
 * Exports functions belonging to --status functionality
 * Belongs to Pup cli entrypoint
 *
 * @file      lib/cli/status.ts
 * @license   MIT
 */

import { ProcessInformationParsed, ProcessState } from "../core/process.ts"
import { Column, Columns, Row } from "./columns.ts"

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
export async function printStatus(configFile: string, statusFile: string) {
  let status
  try {
    status = await getStatus(configFile, statusFile)
    if (!status) {
      console.error("")
      console.error("No running instance found.")
      console.error("")
      Deno.exit(1)
    }
  } catch (e) {
    console.error(e.message)
    Deno.exit(1)
  }

  const taskTable: Row[] = []

  taskTable.push({ separator: "equals" })

  // Add main process
  taskTable.push({
    Id: "Main",
    Type: status.type || "N/A",
    Pid: status.pid?.toString(10) || "N/A",
    Status: status.status || "N/A",
    Started: status.started || "N/A",
    Exited: status.exited || "N/A",
    RSS: status.memory?.rss.toString(10) || "N/A",
    Signal: `${(status.code ?? "-")}${status.signal ? (" " + status.signal) : ""}`,
  })

  taskTable.push({ separator: "dashed" })

  // Add all processes
  for (const taskInfo of Object.values(status.processes)) {
    const currentTask = taskInfo as ProcessInformationParsed
    taskTable.push({
      Id: currentTask.id,
      Type: currentTask.type || "N/A",
      Pid: currentTask.pid?.toString(10) || "N/A",
      Status: ProcessState[currentTask.status] || "N/A",
      Started: currentTask.started || "N/A",
      Exited: currentTask.exited || "N/A",
      RSS: (currentTask.telemetry?.memory?.rss || 0).toString(10) || "N/A",
      Signal: `${(currentTask.code ?? "-")}${currentTask.signal ? (" " + currentTask.signal) : ""}`,
    })
  }

  const tableColumns: Column[] = [
    { key: "Id", header: "Id", minWidth: 15, maxWidth: 24 },
    { key: "Type", header: "Type", minWidth: 5 },
    { key: "Pid", header: "Pid", minWidth: 5 },
    { key: "Status", header: "Status", minWidth: 10 },
    { key: "Started", header: "Started", minWidth: 10 },
    { key: "Exited", header: "Exited", minWidth: 10 },
    { key: "RSS", header: "RSS (byte)", minWidth: 10 },
    { key: "Signal", header: "Signal", minWidth: 10 },
  ]

  console.log(`\n${Columns(taskTable, tableColumns)}\n`)
}

export async function getStatus(configFile?: string, statusFile?: string) {
  if (!configFile) {
    throw new Error(`Could not read status for config file '${configFile}' from '${statusFile}', no instance running.`)
  }

  if (!statusFile) {
    throw new Error(`Could not read config file '${configFile}' from '${statusFile}'. Exiting.`)
  }

  let statusData
  try {
    statusData = await Deno.readTextFile(statusFile)
  } catch (_e) {
    throw new Error(`Could not read status for config file '${configFile}' from '${statusFile}', no instance running.`)
  }

  let status
  try {
    status = JSON.parse(statusData)
  } catch (_e) {
    throw new Error(`Could not parse status for config file '${configFile}' from '${statusFile}, invalid file content.'`)
  }

  // A valid status file were found, figure out if it is stale or not
  if (status && status.updated) {
    const parsedDate = Date.parse(status.updated)
    // Watchdog interval is 2 seconds, allow an extra 8 seconds to pass before allowing a new instance to start after a dirty shutdown
    if (new Date().getTime() - parsedDate > 20000) {
      // Everything is ok, this is definitely a stale file, just continue
      return undefined
    } else {
      return status
    }
  } else {
    return undefined
  }
}
