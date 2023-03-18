import { Pup } from "./core/pup.ts"
import { jsonc, path } from "../deps.ts"
import { checkArguments } from "./cli/checks.ts"
import { parseArguments } from "./cli/args.ts"
import { fileExists } from "./common/utils.ts"
import { generateConfiguration } from "./core/configuration.ts"
import { FileIPC } from "./core/ipc.ts"
import { printFlags, printHeader, printUsage } from "./cli/output.ts"
import { printStatus } from "./cli/status.ts"
import { appendConfigurationFile, createConfigurationFile, findConfigFile, removeFromConfigurationFile } from "./cli/config.ts"

/**
 * Define the main entry point of the CLI application
 *
 * @private
 * @async
 */
async function main(inputArgs: string[]) {
  // Parse and check arguments
  const args = parseArguments(inputArgs)
  const checkedArgs = checkArguments(args)

  // --version
  if (args.version) {
    printHeader()
    Deno.exit(0)
  }

  // --help
  if (args.help) {
    printUsage()
    console.log("")
    printFlags()
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

    // --init, Generate configuration
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

    // --append, Append configuration to existing configuration file
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

    // --remove, Remove process from existing configuration file
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

    // Exit if no configuration file was found
    if (!configFile) {
      console.error("Could not start, no configuration file found")
      Deno.exit(1)
    }

    // Print status if status flag is present
    if (checkedArgs.status) {
      await printStatus(configFile)
      Deno.exit(0)
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

    // Change working directory to configuration file directory
    if (args.cwd) {
      // Change working directory of pup to whereever the configuration file is, change configFile to only contain file name
      try {
        const resolvedPath = path.parse(path.resolve(args.cwd))
        Deno.chdir(resolvedPath.dir)
      } catch (e) {
        console.error(`Could not change working directory to path specified by --cwd ${args.cwd}, exiting. Message: `, e.message)
        Deno.exit(1)
      }
    }
  }

  // Prepare for IPC
  let ipcFile
  if (configFile) ipcFile = `${configFile}.ipc`

  // Prepare status file
  let statusFile
  if (configFile) statusFile = `${configFile}.status`

  // Handle --restart, --stop etc using IPC
  for (const op of ["restart", "start", "stop", "block", "unblock", "terminate"]) {
    if (args[op] !== undefined) {
      // If status file doesn't exist, don't even try to communicate
      if (!statusFile || !await fileExists(statusFile)) {
        console.error(`No status file found, no instance seem to be running.`)
        Deno.exit(1)
      } else if (ipcFile) {
        const ipc = new FileIPC(ipcFile)
        await ipc.sendData(JSON.stringify({ [op]: args[op] || true }))
        Deno.exit(0)
      } else {
        console.error(`No configuration file specified, cannot send command ${op} over IPC.`)
        Deno.exit(1)
      }
    }
  }

  // Do not continue from here if there is a running instance already
  if (statusFile && await fileExists(statusFile)) {
    // ToDo: Check when statusFile were last updated, exit if fresh (which means a instance is already running)
    // Print a warning for now
    console.warn("WARNING! A status file were found. Now you probably have to instances running the same config.")
  }

  // Start pup
  try {
    const pup = new Pup(configuration, statusFile, ipcFile)

    // Start the watchdog
    pup.init()

    // Register for running pup.cleanup() on exit
    addEventListener("unload", () => {
      pup.cleanup()
    })

    // Needed to trigger unload event on CTRL+C
    Deno.addSignalListener("SIGINT", () => {
      Deno.exit(0)
    })

    // Let program end gracefully, no Deno.exit here
  } catch (e) {
    console.error("Could not start pup, invalid configuration:")
    console.error(e.toString())
    Deno.exit(1)
  }
}

export { main }
