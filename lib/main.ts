import { Pup } from "./core/pup.ts"
import { Args, jsonc, path } from "../deps.ts"
import { checkArguments } from "./cli/checks.ts"
import { parseArguments } from "./cli/args.ts"
import { fileExists, isRunning } from "./common/utils.ts"
import { ProcessInformationParsed, ProcessStatus } from "./core/process.ts"
import { generateConfiguration, ProcessConfiguration } from "./core/configuration.ts"
import { FileIPC } from "./core/ipc.ts"

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

  // Read/Generate configuration
  let configuration, configFile
  if (!checkedArgs["no-config"]) {
    // Get configuration file path
    configFile = checkedArgs.config
    if (!configFile) {
      configFile = await findConfigFile()
    }

    // Generate configuration
    if (checkedArgs.init) {
      const fallbackedConfigFile = configFile ?? "pup.jsonc"
      if (await fileExists(fallbackedConfigFile)) {
        console.error(`Configuration file '${fallbackedConfigFile}' already exists, exiting.`)
        Deno.exit(1)
      } else {
        await createConfigurationFile(fallbackedConfigFile, checkedArgs)
        console.log(`Configuration file '${fallbackedConfigFile}' created`)
        Deno.exit(0)
      }
    }

    // Append configuration on --append
    if (checkedArgs.append) {
      const fallbackedConfigFile = configFile ?? "pup.jsonc"
      if (await fileExists(fallbackedConfigFile)) {
        await appendConfigurationFile(fallbackedConfigFile, checkedArgs)
        console.log(`Process '${args.id}' appended to configuration file '${fallbackedConfigFile}'.`)
        Deno.exit(0)
      } else {
        console.log("Configuration file '${fallbackedConfigFile}' not found, use --init if you want to create a new one. Exiting.")
        Deno.exit(1)
      }
    }

    // Remove process on --remove
    if (checkedArgs.remove) {
      const fallbackedConfigFile = configFile ?? "pup.jsonc"
      if (await fileExists(fallbackedConfigFile)) {
        await removeFromConfigurationFile(fallbackedConfigFile, checkedArgs)
        console.log(`Process '${args.id}' removed from configuration file '${fallbackedConfigFile}'.`)
        Deno.exit(0)
      } else {
        console.log("Configuration file '${fallbackedConfigFile}' not found, use --init if you want to create a new one. Exiting.")
        Deno.exit(1)
      }
    }

    // Look for config file
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
    try {
      const rawConfig = await Deno.readTextFile(configFile)
      configuration = jsonc.parse(rawConfig)
    } catch (e) {
      console.error(`Could not start, error reading or parsing configuration file '${configFile}'`)
      console.error(e)
      Deno.exit(1)
    }

    // Change working directory of pup to whereever the configuration file is, change configFile to only contain file name
    try {
      const resolvedPath = path.parse(path.resolve(configFile))
      Deno.chdir(resolvedPath.dir)
      configFile = `${resolvedPath.name}${resolvedPath.ext}`
    } catch (e) {
      console.error(`Could not change working directory to path of '${configFile}, exiting. Message: `, e.message)
      Deno.exit(1)
    }
  } else {
    configuration = generateConfiguration(args.id || "task", args.cmd, args.cwd, args.cron, args.autostart, args.watch)
  }

  // Prepare for IPC
  let ipcFile
  if (configFile) ipcFile = `${configFile}.ipc`

  // Handle --restart, --stop etc
  for (const op of ["restart", "start", "stop", "block", "unblock", "terminate"]) {
    if (args[op] !== undefined) {
      if (ipcFile) {
        const ipc = new FileIPC(ipcFile)
        await ipc.sendData(JSON.stringify({ [op]: args[op] || true }))
        Deno.exit(0)
      } else {
        console.error("No configuration file specified, cannot send restart message.")
        Deno.exit(1)
      }
    }
  }

  // Start pup
  try {
    let statusFile
    if (configFile) statusFile = `${configFile}.status`
    const pup = new Pup(configuration, statusFile, ipcFile)
    pup.init()
  } catch (e) {
    console.error("Could not start pup, invalid configuration:")
    console.error(e.toString())
    Deno.exit(1)
  }
}

/**
 * Helper which creates a configuration file from command line arguments
 *
 * @private
 * @async
 */
async function createConfigurationFile(configFile: string, checkedArgs: Args) {
  try {
    const config = generateConfiguration(checkedArgs.id, checkedArgs.cmd, checkedArgs.cwd, checkedArgs.cron, checkedArgs.autostart, checkedArgs.watch)
    await Deno.writeTextFile(configFile, JSON.stringify(config, null, 2))
  } catch (e) {
    console.error("Could not create/write configuration file: ", e)
    Deno.exit(1)
  }
}

/**
 * Helper which appends a process to an existing configuration file from using command line arguments
 *
 * @private
 * @async
 */
async function appendConfigurationFile(configFile: string, checkedArgs: Args) {
  try {
    // Read existing configuration
    let existingConfigurationObject
    try {
      const existingConfiguration = await Deno.readTextFile(configFile)
      existingConfigurationObject = JSON.parse(existingConfiguration)
    } catch (e) {
      throw new Error("Could not read configuration file.", e.message)
    }
    // Generate new configuration
    const newConfiguration = generateConfiguration(checkedArgs.id, checkedArgs.cmd, checkedArgs.cwd, checkedArgs.cron, checkedArgs.autostart, checkedArgs.watch)
    const newProcess = newConfiguration.processes[0]

    // Check that task id does not already exist
    const alreadyExists = existingConfigurationObject.processes?.find((p: ProcessConfiguration) => p?.id === newProcess?.id)
    if (alreadyExists) {
      throw new Error(`Process id '${newProcess?.id}' already exists, exiting.`)
    }

    // Append new process, and write configuration file
    existingConfigurationObject.processes.push(newConfiguration.processes[0])
    await Deno.writeTextFile(configFile, JSON.stringify(existingConfigurationObject, null, 2))
  } catch (e) {
    console.error(`Could not modify configuration file '${configFile}': `, e.message)
    Deno.exit(1)
  }
}

/**
 * Helper which removes a process from an existing configuration file from using command line arguments
 *
 * @private
 * @async
 */
async function removeFromConfigurationFile(configFile: string, checkedArgs: Args) {
  try {
    // Read existing configuration
    let existingConfigurationObject
    try {
      const existingConfiguration = await Deno.readTextFile(configFile)
      existingConfigurationObject = JSON.parse(existingConfiguration)
    } catch (e) {
      throw new Error("Could not read configuration file.", e.message)
    }

    // Remove from configuration
    const alreadyExists = existingConfigurationObject.processes?.find((p: ProcessConfiguration) => p?.id === checkedArgs?.id)
    if (!alreadyExists) {
      throw new Error(`Process id '${checkedArgs?.id}' not found, exiting.`)
    }

    // Filter out
    existingConfigurationObject.processes = existingConfigurationObject.processes.filter((p: ProcessConfiguration) => p?.id !== checkedArgs?.id)

    // Append new process, and write configuration file
    await Deno.writeTextFile(configFile, JSON.stringify(existingConfigurationObject, null, 2))
  } catch (e) {
    console.error(`Could not modify configuration file ${configFile}: `, e.message)
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
    console.error(`Could not read status for config file '${configFile}' from '${statusFile}'`)
    Deno.exit(1)
  }

  let status
  try {
    status = JSON.parse(statusData)
  } catch (_e) {
    console.error(`Could not read status for config file '${configFile}' from '${statusFile}'`)
    Deno.exit(1)
  }

  console.log(`\nMain process (Version: ${status.version}, PID: ${status.pid}, ${isRunning(status.pid, new Date(Date.parse(status.updated)), 5000)})`)

  for (const taskInfo of Object.values(status.processes)) {
    const currentTask = taskInfo as ProcessInformationParsed
    const processRunning = currentTask.pid ? isRunning(currentTask.pid, new Date(Date.parse(currentTask.updated)), 30000) : "Not running"
    console.log(`\nTask: ${currentTask.id} (${(currentTask.pid ? ("PID: " + currentTask.pid + ", ") : "")}${processRunning})\n`)
    console.log(`  Started:\t${currentTask.started ? currentTask.started.toLocaleString() : "-"}`)
    console.log(`  Last status:\t${ProcessStatus[currentTask.status] ?? "-"}`)
    console.log(`  Last update:\t${currentTask.updated ?? "-"}`)
    console.log(`  Code:\t\t${currentTask.code ?? "-"}`)
    console.log(`  Signal:\t${currentTask.signal ?? "-"}`)
    console.log(`  Exited:\t${currentTask.exited ? currentTask.exited.toLocaleString() : "-"}`)
  }
  console.log("\n")
}

export { main }
