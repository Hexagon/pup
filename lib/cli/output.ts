/**
 * Exports helper functions to print standardised messages
 * Belongs to Pup cli entrypoint
 *
 * Logic is separated from side effects (in this case `console.log` for testability)
 *
 * @file      lib/cli/output.ts
 * @license   MIT
 */

import { Application } from "../../application.meta.ts"
import { type Column, Columns, type TableRow } from "./columns.ts"
import { Colors } from "@cross/utils"

export function createHeaderMessage() {
  return Application.name + " " + Application.version + "\n" + Colors.italic(Application.repository)
}

export function createUsageMessage() {
  return `Usage: ${Application.name} [OPTIONS...]`
}

export function createFlagsMessage(externalInstaller: boolean): string {
  const rows: TableRow[] = []
  rows.push(
    { short: "-h", long: "help", description: "Display this help and exit" },
    { short: "-v", long: "version", description: "Output version information and exit" },
  )
  rows.push(
    { separator: "empty" },
    { content: Colors.bold("Control and monitor instances"), spanStart: 1 },
    { separator: "empty" },
    { long: "run", description: "Run a pup instance standalone" },
    { long: "terminate", description: "Terminate pup instance using IPC" },
    { long: "status", description: "Show status for a pup instance" },
    { long: "monitor", description: "Stream logs from a running instance" },
    { separator: "empty" },
    { short: "-c", long: "--config <path>", description: "Optional. Use specific configuration file." },
    { long: "start <all|proc-id>", description: "Start process using IPC" },
    { long: "stop <all|proc-id>", description: "Stop process using IPC" },
    { long: "restart <all|proc-id>", description: "Restart process using IPC" },
    { long: "block <all|proc-id>", description: "Block process using IPC" },
    { long: "unblock <all|proc-id>", description: "Unblock process using IPC" },
    { separator: "empty" },
    { content: Colors.bold("Service installation"), spanStart: 1 },
    { separator: "empty" },
    { long: "enable-service", description: "Start pup instance at boot" },
    { long: "disable-service", description: "Uninstall pup service" },
    { separator: "empty" },
    { short: "-c", long: "--config <path>", description: "Optional. Use specific configuration file." },
    { description: "Default: ./pup.json" },
    { long: "--dry-run", description: "Generate and output service configuration, do not actually install the service" },
    { long: "--system", description: "Optional. Install the service system-wide (requires root)." },
    { long: "--cwd", description: "Optional. Set working directory for service" },
    { long: "--name", description: "Optional. Set service name" },
    { long: "--user", description: "Optional. Set service run-as user" },
    { long: "--home", description: "Optional. Set service home directory" },
    { long: "--env", short: "-e", description: "Optional. Set environment variables for service, in the format KEY=VALUE." },
    { description: "Multiple variables can be passed by using the flag multiple times," },
    { description: "e.g., --env KEY1=VALUE1 --env KEY2=VALUE2." },
    { content: Colors.bold("Inspecting logs"), spanStart: 1 },
    { separator: "empty" },
    { long: "logs", description: "View the logs for a running instance" },
    { long: "monitor", description: "Stream logs from a running instance" },
    { separator: "empty" },
    { short: "-c", long: "--config <path>", description: "Optional. Use specific configuration file." },
    { long: "--id <process-id>", description: "Optional. Filter logs based on the process ID." },
    { long: "--severity <severity>", description: "Optional. Filter logs based on the severity level." },
    { long: "-n", description: "Optional. Specify the number of log entries to display (logs only)." },
    { long: "--start <iso860-timestamp>", description: "Optional. Display logs after a specified timestamp (logs only)." },
    { long: "--end <iso860-timestamp>", description: "Optional. Display logs before a specific timestamp (logs only)." },
    { description: "Default: ./pup.json" },
    { separator: "empty" },
    { content: Colors.bold("Configuration helpers"), spanStart: 1 },
    { separator: "empty" },
    { long: "init", description: "Initialize a new configuration file using the flags below." },
    { long: "append", description: "Append a new process to the configuration file, " },
    { long: "remove", description: "Remove a process from a configuration file" },
    { description: "configure using the flags below." },
    { separator: "empty" },
    { short: "-c", long: "--config <path>", description: "Optional. Use specific configuration file." },
    { description: "Default: ./pup.json" },
    { long: "--name", description: "Optional. Set a name for the instance." },
    { short: "-I", long: "--id", description: "Id of the process to add/append/remove from configuration." },
    { short: "-C", long: "--cmd", description: "Command to run, for complex commands use '--' then the command." },
    { short: "-W", long: "--worker", description: "Worker script to run, any trailing arguments are passed to the worker" },
    { short: "-A", long: "--autostart", description: "Set the new process to start automatically." },
    { short: "-w", long: "--watch", description: "Location to watch for filesystem changes." },
    { short: "-O", long: "--cron", description: "Start according to a cron pattern." },
    { short: "-T", long: "--terminate", description: "Terminate according to a cron pattern." },
    { short: "-d", long: "--cwd", description: "Working directory for the process." },
    { long: "--instances", description: "Cluster: Number of instances to run." },
    { long: "--start-port", description: "Cluster: Start port for instances." },
    { long: "--common-port", description: "Cluster: Common port for instances." },
    { long: "--strategy", description: "Cluster: Load balancing strategy (defaults to round-robin)." },
    { separator: "empty" },
    { content: Colors.bold("API Token Management"), spanStart: 1 },
    { separator: "empty" },
    { long: "token", description: "Generate a new API token" },
    { separator: "empty" },
    { long: "--consumer <consumer-id>", description: "Consumer identifier, used to revoke the token." },
    { long: "--expire-in <seconds>", description: "Optional. Token life-time" },
  )
  if (!externalInstaller) {
    rows.push(
      { separator: "empty" },
      { content: Colors.bold("Upgrade pup"), spanStart: 1 },
      { separator: "empty" },
      { long: "upgrade", description: "Upgrade pup and exit." },
      /* { long: "setup", description: "Install pup and exit." }, Keep setup undocumented to avoid confusion */
      { separator: "empty" },
      { long: "--channel <name>", description: "Select channel. stable (default), prerelease or canary." },
      { long: "--version <version>", description: "Install or upgrade to a specific version." },
      { separator: "empty" },
    )
  }

  const columns: Column[] = [
    { key: "short", align: "right", minWidth: 4 },
    { key: "long", minWidth: 24 },
    { key: "description" },
  ]

  // All your previous code for building rows and columns, finally:
  return Columns(rows, columns)
}

export function printHeader() {
  console.log(createHeaderMessage())
}

export function printUsage() {
  console.log(createUsageMessage())
}

export function printFlags(externalInstaller: boolean) {
  console.log(createFlagsMessage(externalInstaller))
}
