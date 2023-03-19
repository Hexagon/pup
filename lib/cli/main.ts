/**
 * Exports main function of Pup cli entrypoint
 *
 * @file      lib/cli/main.ts
 * @license   MIT
 */

// Import core dependencies
import { Pup } from "../core/pup.ts"
import { generateConfiguration } from "../core/configuration.ts"
import { FileIPC } from "../core/ipc.ts"

// Import CLI utilities
import { printFlags, printHeader, printUsage } from "./output.ts"
import { checkArguments, parseArguments } from "./args.ts"
import { appendConfigurationFile, createConfigurationFile, findConfigFile, removeFromConfigurationFile } from "./config.ts"
import { printStatus } from "./status.ts"

// Import common utilities
import { fileExists } from "../common/utils.ts"

// Import external dependencies
import { jsonc, path } from "../../deps.ts"

/**
 * Define the main entry point of the CLI application
 *
 * @private
 * @async
 */
async function main(inputArgs: string[]) {
  /**
   * Extract part after "--", which can be used in place of --cmd
   */
  let postDelimiter: string[] = []
  if (inputArgs.indexOf("--") >= 0) {
    postDelimiter = inputArgs.slice(inputArgs.indexOf("--") + 1)
  }
  console.log(postDelimiter)
  const args = parseArguments(inputArgs)
  const checkedArgs = checkArguments(args, postDelimiter)
  const cmd = checkedArgs.cmd.split(" ") || postDelimiter

  /**
   * Begin with --version and --help, as they have no dependencies on other
   * arguments, and just exit
   */

  if (args.version) {
    printHeader()
    Deno.exit(0)
  }

  if (args.help) {
    printUsage()
    console.log("")
    printFlags()
    Deno.exit(0)
  }

  /**
   * Now either
   * - Use no configuration (--no-config)
   * - Find configuration using (--config)
   * - Or generate configuration using (--init)
   */
  const useConfigFile = !(checkedArgs["no-config"])
  let configFile = await findConfigFile(useConfigFile, checkedArgs.config)

  // --init, Generate configuration
  if (checkedArgs.init) {
    // Default new configuration file to pup.jsonc
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

  // Exit if no configuration file was found, or specified configuration file were not found
  if (useConfigFile && !configFile) {
    console.error("Configuration file not found.")
    Deno.exit(1)
  }

  /**
   * Now when the configuration file is located
   * --status, print status for current running instance, and exit.
   */
  if (checkedArgs.status) {
    if (!configFile) {
      console.error("Can not print status, no configuration file found")
      Deno.exit(1)
    }
    await printStatus(configFile)
    Deno.exit(0)
  }

  /**
   * Now, the arguments to modify existing configuration files and exit
   * -- append - Append configuration to existing configuration file and exit
   * -- remove - Remove process from existing configuration file and exit
   */
  if (checkedArgs.append) {
    if (configFile) {
      await appendConfigurationFile(configFile, checkedArgs)
      console.log(`Process '${args.id}' appended to configuration file '${configFile}'.`)
      Deno.exit(0)
    } else {
      console.log(`Configuration file '${configFile}' not found, use --init if you want to create a new one. Exiting.`)
      Deno.exit(1)
    }
  }

  if (checkedArgs.remove) {
    if (configFile) {
      await removeFromConfigurationFile(configFile, checkedArgs)
      console.log(`Process '${args.id}' removed from configuration file '${configFile}'.`)
      Deno.exit(0)
    } else {
      console.log("Configuration file '${fallbackedConfigFile}' not found, use --init if you want to create a new one. Exiting.")
      Deno.exit(1)
    }
  }

  /**
   * Change working directory to where the configuration file is, if there is one.
   */
  if (useConfigFile && configFile) {
    try {
      const resolvedPath = path.parse(path.resolve(configFile))
      Deno.chdir(resolvedPath.dir)
      configFile = `${resolvedPath.name}${resolvedPath.ext}`
    } catch (e) {
      console.error(`Could not change working directory to path of '${configFile}, exiting. Message: `, e.message)
      Deno.exit(1)
    }
  }

  // Read or generate configuration
  let configuration
  if (configFile) {
    try {
      const rawConfig = await Deno.readTextFile(configFile)
      configuration = jsonc.parse(rawConfig)
    } catch (e) {
      console.error(`Could not start, error reading or parsing configuration file '${configFile}'`)
      console.error(e)
      Deno.exit(1)
    }
  } else {
    configuration = generateConfiguration(args.id || "task", cmd, args.cwd, args.cron, args.autostart, args.watch)

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
  if (useConfigFile) ipcFile = `${configFile}.ipc`

  // Prepare status file
  let statusFile
  if (useConfigFile) statusFile = `${configFile}.status`

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

  /**
   * Print a warning if there is an existing status file
   * - ToDo: Check when statusFile were last updated, exit if fresh (which means a instance is already running)
   * - Just print a warning for now
   */
  if (statusFile && await fileExists(statusFile)) {
    console.warn(`WARNING! A status file were found at '${statusFile}, there could be an existing instance of pup running, or the file can be stale.`)
  }

  /**
   * Ready to start pup!
   */
  try {
    const pup = new Pup(configuration, statusFile, ipcFile)

    // Start the watchdog
    pup.init()

    // Register for running pup.cleanup() on exit
    addEventListener("unload", () => {
      pup.cleanup()
    })

    // This is needed to trigger unload event on CTRL+C
    // See https://github.com/denoland/deno/issues/11752
    Deno.addSignalListener("SIGINT", () => {
      Deno.exit(0)
    })

    // Let program end gracefully, no Deno.exit here
  } catch (e) {
    console.error("Could not start pup, invalid configuration:", e.message)
    Deno.exit(1)
  }
}

export { main }
