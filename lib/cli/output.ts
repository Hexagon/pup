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
    { short: "-h", long: "help", description: "Display this help and exit" },
    { short: "-v", long: "version", description: "Output version information and exit" },
    { long: "upgrade <version>", description: "Upgrade to latest or specific version, and exit." },
    { separator: "empty" },
    { content: "Start pup, use with configuration file, or process configuration flags below", spanStart: 1 },
    { separator: "empty" },
    { long: "run", description: "Run a pup instance" },
    { separator: "empty" },
    { content: "Configuration file", spanStart: 1 },
    { separator: "empty" },
    { short: "-c", long: '--config "path"', description: "Use specific configuration file." },
    { description: "Default: ./pup.jsonc or ./pup.json" },
    { separator: "empty" },
    { content: "Configuration file helpers", spanStart: 1 },
    { separator: "empty" },
    { long: "init", description: "Initialize a new configuration file using the flags below." },
    { long: "append --id proc-id", description: "Append a new process to the configuration file, " },
    { description: "configure using the flags below." },
    { long: "remove --id proc-id", description: "Remove a process from a configuration file," },
    { description: "specify process using '--id'." },
    { separator: "empty" },
    { content: "Process configuration, used with above config helpers, or '--no-config'", spanStart: 1 },
    { separator: "empty" },
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
    { content: "Control a running instance", spanStart: 1 },
    { separator: "empty" },
    { long: "restart all|proc-id", description: "Restart process using IPC" },
    { long: "start all|proc-id", description: "Start process using IPC" },
    { long: "stop all|proc-id", description: "Stop process using IPC" },
    { long: "block all|proc-id", description: "Block process using IPC" },
    { long: "unblock all|proc-id", description: "Unblock process using IPC" },
    { long: "terminate all|proc-id", description: "Forcefully terminate process using IPC" },
    { separator: "empty" },
    { content: "Monitor a running instance", spanStart: 1 },
    { separator: "empty" },
    { long: "status", description: "Display status for a running instance" },
    { separator: "empty" },
    { content: "Service installation", spanStart: 1 },
    { separator: "empty" },
    { long: "service install", description: "Install pup as a service" },
    { long: "service generate", description: "Generate and output service configuration, do not install" },
    { separator: "empty" },
    { long: "--system", description: "Optional. Install the service system-wide (requires root)." },
    { long: "--cwd", description: "Optional. Set working directory for service" },
    { long: "--name", description: "Optional. Set service name" },
    { long: "--user", description: "Optional. Set service run-as user" },
    { long: "--home", description: "Optional. Set service home directory" },
    { long: "--env", short: "-e", description: "Optional. Set environment variables for service, in the format KEY=VALUE." },
    { description: "Multiple variables can be passed by using the flag multiple times," },
    { description: "e.g., --env KEY1=VALUE1 --env KEY2=VALUE2." },
    { separator: "empty" },
  ]

  const columns: Column[] = [
    { key: "short", align: "right", minWidth: 8 },
    { key: "long", minWidth: 24 },
    { key: "description" },
  ]

  console.log(Columns(rows, columns))
}
