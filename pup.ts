/**
 * Cli application entrypoint
 *
 * @file pup.ts
 */

import { Pup } from "./lib/pup.ts"
import { jsonc } from "./deps.ts"
import { checkArguments } from "./lib/checks.ts"
import { parseArguments } from "./lib/args.ts"
import { fileExists, isRunning } from "./lib/utils.ts"
import { Configuration } from "./lib/configuration.ts"
import { TaskInfo } from "./lib/status.ts"

// Parse arguments, null from parseArguments indicate that the program is already done, happens in case of --help
let args
try {
  args = checkArguments(parseArguments(Deno.args))
} catch (e) {
  console.error(e)
  Deno.exit(1)
}

// Quit instantly if --help or --version were present
if (args === null) Deno.exit(0)

// No configuration
let configFile: string | null = null

// Configuration from command line argument --config/-c
if (args?.config) {
  configFile = args.config
}

// Try default configuration file pup.json
if (!configFile || configFile === null) {
  if (await fileExists("./pup.json")) {
    configFile = "./pup.json"
  } else if (await fileExists("./pup.jsonc")) {
    configFile = "./pup.jsonc"
  }
}

// Print status and exit if status flag were specified
if (args.status) {
  // Read status file
  let result
  try {
    result = await Deno.readTextFile(configFile + ".status")
  } catch (_e) {
    console.error("Could not read status for config file '" + configFile + "'")
    Deno.exit(1)
  }

  // Parse status file
  let parsed
  try {
    parsed = JSON.parse(result)
  } catch (_e) {
    console.error("Could not read status for config file '" + configFile + "'")
    Deno.exit(1)
  }

  // Write information on main process
  console.log(`\nMain process \t${parsed.pid} (${isRunning(parsed.pid, Date.parse(parsed.heartbeat), 20000)})`)

  // Write information on subprocesses
  for (const p of Object.values(parsed.taskRegistry)) {
    const taskInfo: TaskInfo = p as TaskInfo
    const processRunning = taskInfo.pid ? isRunning(taskInfo.pid, taskInfo.lastUpdate ? Date.parse(taskInfo.lastUpdate) : 0, 30000) : "Not started"

    console.log(`\n  Task: ${taskInfo.name} (PID: ${taskInfo.pid || ""}, ${processRunning})\n`)

    if (taskInfo.lastUpdate) console.log(`    Last update:\t${taskInfo.lastUpdate}`)
    if (taskInfo.exitCode) console.log(`    Code:\t\t${taskInfo.exitCode}`)
    if (taskInfo.signal) console.log(`    Signal:\t\t${taskInfo.signal}`)
    if (taskInfo.started) console.log(`    Started:\t\t${taskInfo.started.toLocaleString()}`)
    if (taskInfo.exited) console.log(`    Exited:\t\t${taskInfo.exited.toLocaleString()}`)
    if (taskInfo.lastStdout) console.log(`    Last stdout:\t${taskInfo.lastStdout}`)
    if (taskInfo.lastStderr) console.log(`    Last stderr:\t${taskInfo.lastStderr}`)
  }

  console.log("\n")

  Deno.exit(0)
}

// Exit if no configuration file were specified
if (configFile === null) {
  console.error("Could not start, no configuration file found")
  Deno.exit(1)
}

// Exit if specified configuration file is not found
if (!await fileExists(configFile)) {
  console.error("Could not start, specified configuration file not found")
  Deno.exit(1)
}

// Try to read configuration
let rawConfig
try {
  rawConfig = await Deno.readTextFile(configFile)
} catch (e) {
  console.error("Could not start, error reading configuration file", e)
  Deno.exit(1)
}

// Try to parse configuration
let configuration
try {
  configuration = jsonc.parse(rawConfig)
} catch (e) {
  console.error("Could not start, error parsing configuration file", e)
  Deno.exit(1)
}

// Try to initialize pup
try {
  await new Pup(configuration as Configuration, configFile)
} catch (e) {
  console.error("Could not start pup, invalid configuration:")
  console.error(e.toString())
  Deno.exit(1)
}
