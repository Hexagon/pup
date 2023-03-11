/**
 * CLI application entry point of Pup
 *
 * - Defines and runs a function `main()`
 *
 * - Exports application metadata as `{ Application }`, see bottom of file
 *
 * @file      pup.ts
 * @license   MIT
 */

import { Pup } from "./lib/core/pup.ts"
import { jsonc } from "./deps.ts"
import { checkArguments } from "./lib/cli/checks.ts"
import { parseArguments } from "./lib/cli/args.ts"
import { fileExists, isRunning } from "./lib/common/utils.ts"
import { TaskInfo } from "./lib/core/status.ts"

/**
 * Define the main entry point of the CLI application
 *
 * @private
 * @async
 */
async function main() {
  // Parse and check arguments
  const args = parseArguments(Deno.args)
  const checkedArgs = checkArguments(args)
  if (checkedArgs === null) {
    Deno.exit(0)
  }

  // Get configuration file path
  let configFile = checkedArgs.config
  if (!configFile) {
    configFile = await findConfigFile()
  }

  // Print status if status flag is present
  if (checkedArgs.status) {
    await printStatus(configFile)
    Deno.exit(0)
  }

  // Exit if no configuration file was found
  if (!configFile) {
    console.error("Could not start, no configuration file found")
    Deno.exit(1)
  }

  // Exit if specified configuration file is not found
  if (!await fileExists(configFile)) {
    console.error("Could not start, specified configuration file not found")
    Deno.exit(1)
  }

  // Read and parse configuration
  let configuration
  try {
    const rawConfig = await Deno.readTextFile(configFile)
    configuration = jsonc.parse(rawConfig)
  } catch (e) {
    console.error(`Could not start, error reading or parsing configuration file '${configFile}'`)
    console.error(e)
    Deno.exit(1)
  }

  // Start pup
  try {
    const statusFile = `${configFile}.status`
    const pup = new Pup(configuration, statusFile)
    await pup.start()
  } catch (e) {
    console.error("Could not start pup, invalid configuration:")
    console.error(e.toString())
    Deno.exit(1)
  }
}

/**
 * Helper which tries to find the configuration file
 * if it was not specified in the command line arguments
 *
 * @private
 * @async
 */
async function findConfigFile(): Promise<string | null> {
  if (await fileExists("./pup.json")) {
    return "./pup.json"
  } else if (await fileExists("./pup.jsonc")) {
    return "./pup.jsonc"
  } else {
    return null
  }
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
async function printStatus(configFile: string) {
  const statusFile = `${configFile}.status`

  let statusData
  try {
    statusData = await Deno.readTextFile(statusFile)
  } catch (_e) {
    console.error(`Could not read status for config file '${configFile}'`)
    Deno.exit(1)
  }

  let status
  try {
    status = JSON.parse(statusData)
  } catch (_e) {
    console.error(`Could not read status for config file '${configFile}'`)
    Deno.exit(1)
  }

  console.log(`\nMain process \t${status.pid} (${isRunning(status.pid, Date.parse(status.heartbeat), 20000)})`)

  for (const taskInfo of Object.values(status.taskRegistry)) {
    const currentTask = taskInfo as TaskInfo
    const processRunning = currentTask.pid ? isRunning(currentTask.pid, currentTask.lastUpdate ? Date.parse(currentTask.lastUpdate) : 0, 30000) : "Not started"
    console.log(`\n  Task: ${currentTask.name} (PID: ${currentTask.pid || ""}, ${processRunning})\n`)
    if (currentTask.lastUpdate) console.log(`    Last update:\t${currentTask.lastUpdate}`)
    if (currentTask.exitCode) console.log(`    Code:\t\t${currentTask.exitCode}`)
    if (currentTask.signal) console.log(`    Signal:\t\t${currentTask.signal}`)
    if (currentTask.started) console.log(`    Started:\t\t${currentTask.started.toLocaleString()}`)
    if (currentTask.exited) console.log(`    Exited:\t\t${currentTask.exited.toLocaleString()}`)
    if (currentTask.lastStdout) console.log(`    Last stdout:\t${currentTask.lastStdout}`)
    if (currentTask.lastStderr) console.log(`    Last stderr:\t${currentTask.lastStderr}`)
  }
  console.log("\n")
}

main()

const Application = {
  "name": "pup",
  "version": "1.0.0-alpha-3",
  "repository": "https://github.com/Hexagon/pup",
}
export { Application }
