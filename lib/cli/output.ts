/**
 * Exports helper functions to print standardised messages
 * Belongs to Pup cli entrypoint
 *
 * @file      lib/cli/output.ts
 * @license   MIT
 */

import { Application } from "../../application.meta.ts"
import { Column, Columns, TableRow } from "./columns.ts"

export function printHeader() {
  console.log(Application.name + " " + Application.version)
  console.log(Application.repository)
}

export function printUsage() {
  console.log(`Usage: ${Application.name} [OPTIONS...]`)
}

export function printFlags() {
  const rows: TableRow[] = [
    { content: "General", spanStart: 1, align: "left" },
    { separator: "empty" },
    { short: "-h", long: "--help", description: "Display this help and exit" },
    { short: "-v", long: "--version", description: "Output version information and exit" },
    { long: "--upgrade <version>", description: "Upgrade to latest or specifiec version, and exit." },
    { separator: "empty" },
    { content: "Configuration file", spanStart: 1 },
    { separator: "empty" },
    { short: "-c", long: '--config "path"', description: "Use specific configuration file." },
    { description: "Default: pup.jsonc" },
    { short: "-n", long: "--no-config", description: "Run without configuration. Specify command " },
    { description: "and policies using Process configuration." },
    { separator: "empty" },
    { content: "Configuration file helpers", spanStart: 1 },
    { separator: "empty" },
    { short: "-i", long: "--init", description: "Initialize a new configuration file using the flags below." },
    { short: "-a", long: "--append proc-id", description: "Append a new process to the configuration file, " },
    { description: "configure using the flags below." },
    
    { short: "-r", long: "--remove proc-id", description: "Remove a process from a configuration file," },
    { description: "specify process using '--id'." },
    
    { separator: "empty" },
    { content: "Process configuration, used with above config helpers, or '--no-config'", spanStart: 1 },
    { separator: "empty" },
    { short: "-I", long: "--id", description: "Id of the process to add/append/remove from configuration." },
    { short: "-C", long: "--cmd", description: "Command to run, for complex commands use '--' then the command." },
    { short: "-A", long: "--autostart", description: "Set the new process to start automatically." },
    { short: "-w", long: "--watch", description: "Location to watch for filesystem changes." },
    { short: "-O", long: "--cron", description: "Start according to a cron pattern." },
    { short: "-W", long: "--cwd", description: "Working directory for the process." },
    { separator: "empty" },
    { content: "Control a running instance", spanStart: 1 },
    { separator: "empty" },
    { long: "--restart all|proc-id", description: "Restart process using IPC" },
    { long: "--start all|proc-id", description: "Start process using IPC" },
    { long: "--stop all|proc-id", description: "Stop process using IPC" },
    { long: "--block all|proc-id", description: "Block process using IPC" },
    { long: "--unblock all|proc-id", description: "Unblock process using IPC" },
    { long: "--terminate all|proc-id", description: "Forcefully terminate process using IPC" },
    { separator: "empty" },
    { content: "Monitor a running instance", spanStart: 1 },
    { separator: "empty" },
    { short: "-s", long: "--status", description: "Display status for a running instance" },
    { separator: "empty" },
  ]

  const columns: Column[] = [
    { key: "short", align: "right", minWidth: 8 },
    { key: "long", minWidth: 24 },
    { key: "description" },
  ]

  console.log(Columns(rows, columns))
}
