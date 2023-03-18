/**
 * Exports helper functions to print standardised messages
 * Belongs to Pup cli entrypoint
 *
 * @file      lib/cli/output.ts
 * @license   MIT
 */

import { Application } from "../../application.meta.ts"

export function printHeader() {
  console.log(Application.name + " " + Application.version)
  console.log(Application.repository)
}

export function printUsage() {
  console.log(`Usage: ${Application.name} [OPTIONS...]`)
}

export function printFlags() {
  console.log(" -h\t--help\t\t\tDisplay this help and exit")
  console.log(" -v\t--version\t\tOutput version information and exit")
  console.log("")
  console.log(' -c\t--config "path"\t\tUse specific configuration file. Default: pup.jsonc')
  console.log(" -n\t--no-config\t\tDo not use a configuration file")
  console.log("")
  console.log("Configuration file helpers")
  console.log("")
  console.log(" -i\t--init\t\t\tCreate a new pup.json")
  console.log(" -a\t--append\t\tAppend to existing configuraton file")
  console.log("")
  console.log("Process settings, for --no-config, --init, and --append")
  console.log("")
  console.log(' -I\t--id "name"\t\tname of the task')
  console.log(' -C\t--cmd "command"\t\tCommand to run')
  console.log(' -W\t--cwd "command"\t\tWorking directory of the process')
  console.log(" -A\t--autostart\t\tAutostart process")
  console.log(" -O\t--cron\t\t\tStart using a cron pattern")
  console.log(' -w\t--watch "path"\t\tRestart on file change')
  console.log("")
  console.log("Control a running instance")
  console.log("")
  console.log("   \t--restart all|proc-id\tRestart process using IPC")
  console.log("   \t--start all|proc-id\tStart process using IPC")
  console.log("   \t--stop all|proc-id\tStop process using IPC")
  console.log("   \t--block all|proc-id\tBlock process using IPC")
  console.log("   \t--unblock all|proc-id\tUnblock process using IPC")
  console.log("")
  console.log("Monitor a running instance")
  console.log("")
  console.log(" -s\t--status\t\tDisplay status for a running instance")
  console.log("")
}
