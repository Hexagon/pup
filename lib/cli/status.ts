/**
 * Exports functions belonging to 'status' functionality
 * Belongs to Pup cli entrypoint
 *
 * @file      lib/cli/status.ts
 * @license   MIT
 */

import { type ProcessInformation, ProcessState } from "../core/process.ts"
import type { ApplicationState } from "../core/status.ts"
import { type Column, Columns, type Row } from "./columns.ts"
import { Colors, exit } from "@cross/utils"
import { filesize } from "filesize"
import { blockedFormatter, codeFormatter, naFormatter, statusFormatter } from "./formatters/strings.ts"
import { timeagoFormatter } from "./formatters/times.ts"
import { Configuration } from "../core/configuration.ts"
import { resolve } from "@std/path"

/**
 * Helper which print the status of all running processes,
 * including this main process
 *
 * Triggered by supplying cli parameter `status`
 *
 * @private
 * @async
 */
export async function printStatus(configFile: string, statusFile: string, configuration: Configuration, cwd: string | undefined) {
  let status
  try {
    status = await getStatus(configFile, statusFile)
    if (!status) {
      console.error("\nNo running instance found.\n")
      exit(1)
    }
  } catch (e) {
    console.error(e.message)
    exit(1)
  }

  // Print configuration
  console.log("")
  console.log(Colors.bold("Configuration:") + "\t" + resolve(configFile))
  console.log(Colors.bold("Working dir:") + "\t" + cwd || "Not set (default: pup)")
  console.log(Colors.bold("Instance name:") + "\t" + (configuration.name || "Not set"))
  console.log(Colors.bold("Plugins:") + "\t" + (configuration.plugins?.map((p) => p.url).join(", ") || "None"))

  const taskTable: Row[] = []

  // Add main process
  taskTable.push({
    Id: configuration.name || "pup",
    Type: status!.type.slice(0, 4) || "N/A",
    Status: status!.status || "N/A",
    Blocked: "N/A",
    Started: timeagoFormatter(status!.started ? status!.started : "N/A"),
    Exited: "N/A",
    RSS: status!.memory?.rss ? filesize(status!.memory?.rss, { round: 0 }) : "N/A",
    Signal: "N/A",
  })

  // Add all processes
  for (const taskInfo of Object.values(status!.processes)) {
    const currentTask = taskInfo as ProcessInformation
    taskTable.push({
      Id: " " + currentTask.id,
      Type: currentTask.type.slice(0, 4) || "N/A",
      Status: ProcessState[currentTask.status] || "N/A",
      Blocked: currentTask.blocked ? "Yes" : "No",
      Started: timeagoFormatter(currentTask.started ? currentTask.started : "N/A"),
      Exited: timeagoFormatter(currentTask.exited ? currentTask.exited : "N/A"),
      RSS: currentTask.telemetry?.memory?.rss ? filesize(currentTask.telemetry?.memory?.rss, { round: 0 }) : "N/A",
      Signal: `${(currentTask.code ?? "N/A")}${currentTask.signal ? (" " + currentTask.signal) : ""}`,
    })
  }

  const tableColumns: Column[] = [
    { key: "Id", header: "Id", minWidth: 15, maxWidth: 24 },
    { key: "Type", header: "Type", minWidth: 5 },
    { key: "Status", header: "Status", minWidth: 10, formatter: statusFormatter },
    { key: "Blocked", header: "Blocked", minWidth: 8, formatter: blockedFormatter },
    { key: "Started", header: "Started", minWidth: 10, formatter: naFormatter },
    { key: "Exited", header: "Exited", minWidth: 10, formatter: naFormatter },
    { key: "RSS", header: "RSS", minWidth: 6, formatter: naFormatter },
    { key: "Signal", header: "Code", minWidth: 10, formatter: codeFormatter },
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

  let status: ApplicationState | undefined = undefined
  try {
    const kv = await Deno.openKv(statusFile)
    const result = await kv.get(["last_application_state"])
    kv.close()
    if (result) {
      status = result.value as ApplicationState
    }
  } catch (e) {
    throw new Error(`Could not read status for config file '${configFile}' from '${statusFile}', could not read store: ${e.message}.`)
  }
  // A valid status file were found, figure out if it is stale or not
  if (status && status.updated) {
    const parsedDate = Date.parse(status.updated)
    // Watchdog interval is 2 seconds, allow an extra 3 seconds to pass before allowing a new instance to start after a dirty shutdown
    if (new Date().getTime() - parsedDate > 5000) {
      // Everything is ok, this is definitely a stale file, just continue
      return undefined
    }
    return status
  }

  return undefined
}
