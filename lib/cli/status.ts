/**
 * Exports functions belonging to 'status' functionality
 * Belongs to Pup cli entrypoint
 *
 * @file      lib/cli/status.ts
 * @license   MIT
 */

import { type ProcessInformation } from "../core/process.ts"
import { ApiProcessState } from "@pup/api-definitions"
import { type Column, Columns, type Row } from "./columns.ts"
import { Colors } from "@cross/utils"
import { filesize } from "filesize"
import { blockedFormatter, codeFormatter, naFormatter, restartsFormatter, statusFormatter } from "./formatters/strings.ts"
import { timeagoFormatter } from "./formatters/times.ts"
import { Configuration, DEFAULT_REST_API_HOSTNAME } from "../core/configuration.ts"
import { ApiApplicationState } from "@pup/api-definitions"
import { toResolvedAbsolutePath } from "@pup/common/path"

/**
 * Helper which print the status of all running processes,
 * including this main process
 *
 * Triggered by supplying cli parameter `status`
 *
 * @private
 * @async
 */
export function printStatus(configFile: string, configuration: Configuration, cwd: string | undefined, status: ApiApplicationState) {
  // Print configuration
  console.log("")
  console.log(Colors.bold("Configuration:") + "\t" + toResolvedAbsolutePath(configFile))
  console.log(Colors.bold("Working dir:") + "\t" + (cwd ? toResolvedAbsolutePath(cwd as string) : "Not set (default: pup)"))
  console.log(Colors.bold("Instance name:") + "\t" + (configuration.name || "Not set"))
  console.log(Colors.bold("Rest API URL:") + "\thttp://" + (configuration.api?.hostname || DEFAULT_REST_API_HOSTNAME) + ":" + status.port)

  const taskTable: Row[] = []

  // Add main process
  taskTable.push({
    Id: configuration.name || "pup",
    Type: status!.type.slice(0, 4) || "N/A",
    Status: status!.status || "N/A",
    Blocked: "N/A",
    Started: timeagoFormatter(status!.started ? status!.started : "N/A"),
    Exited: "N/A",
    Restarts: "N/A",
    RSS: status!.memory?.rss ? filesize(status!.memory?.rss, { round: 0 }) : "N/A",
    Signal: "N/A",
  })

  // Add all processes
  for (const taskInfo of Object.values(status!.processes)) {
    const currentTask = taskInfo as ProcessInformation
    taskTable.push({
      Id: " " + currentTask.id,
      Type: currentTask.type.slice(0, 4) || "N/A",
      Status: ApiProcessState[currentTask.status] || "N/A",
      Blocked: currentTask.blocked ? "Yes" : "No",
      Started: timeagoFormatter(currentTask.started ? currentTask.started : "N/A"),
      Exited: timeagoFormatter(currentTask.exited ? currentTask.exited : "N/A"),
      Restarts: currentTask.restarts !== undefined ? currentTask.restarts.toString() : "N/A",
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
    { key: "Restarts", header: "Restarts", minWidth: 6, formatter: restartsFormatter },
    { key: "RSS", header: "RSS", minWidth: 6, formatter: naFormatter },
    { key: "Signal", header: "Code", minWidth: 10, formatter: codeFormatter },
  ]

  console.log(`\n${Columns(taskTable, tableColumns)}\n`)
}
