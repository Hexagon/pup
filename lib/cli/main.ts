/**
 * Exports main function of Pup cli entrypoint
 *
 * @file      lib/cli/main.ts
 * @license   MIT
 */

// Import core dependencies
import { Pup } from "../core/pup.ts"
import { Configuration, generateConfiguration, validateConfiguration } from "../core/configuration.ts"
import { FileIPC } from "../core/ipc.ts"

// Import CLI utilities
import { printFlags, printHeader, printUsage } from "./output.ts"
import { checkArguments, parseArguments } from "./args.ts"
import { appendConfigurationFile, createConfigurationFile, findConfigFile, removeFromConfigurationFile } from "./config.ts"
import { printStatus } from "./status.ts"

// Import common utilities
import { fileExists, toTempPath } from "../common/utils.ts"

// Import external dependencies
import { jsonc, path } from "../../deps.ts"

/**
 * Define the main entry point of the CLI application
 *
 * @private
 * @async
 */
async function main(inputArgs: string[]) {
  const args = parseArguments(inputArgs)

  /**
   * Before checking the arguments, extract part after "--",
   * which can be used in place of --cmd
   */
  let postDelimiter: string[] = []
  if (inputArgs.indexOf("--") >= 0) {
    postDelimiter = inputArgs.slice(inputArgs.indexOf("--") + 1)
  }
  const checkedArgs = checkArguments(args, postDelimiter)
  const cmd = checkedArgs.cmd?.split(" ") || postDelimiter

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
      await createConfigurationFile(fallbackedConfigFile, checkedArgs, cmd)
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
   * Now, the arguments to modify existing configuration files and exit
   * -- append - Append configuration to existing configuration file and exit
   * -- remove - Remove process from existing configuration file and exit
   */
  if (checkedArgs.append) {
    if (configFile) {
      await appendConfigurationFile(configFile, checkedArgs, cmd)
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
  let configuration: Configuration
  if (configFile) {
    try {
      const rawConfig = await Deno.readTextFile(configFile)
      configuration = validateConfiguration(jsonc.parse(rawConfig))
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
  if (useConfigFile) ipcFile = `${toTempPath(configFile as string)}/.ipc`

  // Prepare status file
  let statusFile
  if (useConfigFile) statusFile = `${toTempPath(configFile as string)}/.status`

  /**
   * Now when the configuration file is located
   * --status, print status for current running instance, and exit.
   */
  if (checkedArgs.status) {
    if (!statusFile || !configFile) {
      console.error("Can not print status, no configuration file found")
      Deno.exit(1)
    }
    await printStatus(configFile, statusFile)
    Deno.exit(0)
  }

  // Handle --restart, --stop etc using IPC
  for (const op of ["restart", "start", "stop", "block", "unblock", "terminate"]) {
    if (args[op] !== undefined) {
      // If status file doesn't exist, don't even try to communicate
      if (!statusFile || !await fileExists(statusFile)) {
        console.error(`No status file found, no instance seem to be running.`)
        Deno.exit(1)
      } else if (ipcFile) {
        // Check that operation is "all" or set to an valid id
        if (args[op] === "all" || configuration.processes?.find((p) => p.id === args[op])) {
          const ipc = new FileIPC(ipcFile)
          await ipc.sendData(JSON.stringify({ [op]: args[op] || true }))
          Deno.exit(0)
        } else {
          console.error(`Could not ${op} process '${args[op]}', process not found.`)
          Deno.exit(0)
        }
      } else {
        console.error(`No configuration file specified, cannot send command ${op} over IPC.`)
        Deno.exit(1)
      }
    }
  }

  /**
   * handle the case where there is an existing status file
   */
  if (statusFile && await fileExists(statusFile)) {
    // Read status file, exit if not readable
    // - Probably locked by a running process
    let statusData
    try {
      statusData = await Deno.readTextFile(statusFile)
    } catch (_e) {
      console.error(`Could not read existing statusfile '${statusFile}', main process probably already running. Exiting.`)
      Deno.exit(1)
    }

    // Parse status file, continue if not parseable
    // - Probably a stale file from a broken process
    let status
    try {
      status = JSON.parse(statusData)
    } catch (_e) {
      console.error(`Could not parse status for config file '${configFile}' from '${statusFile}, invalid file content. Assuming a stale status file and starting anyway.'`)
    }

    if (!status) {
      console.warn(`WARNING! A broken status file were found at '${statusFile}', there could be an existing instance of pup running, continuing anyway.`)
    } else {
      // A valid status file were found, figure out if it is stale or not
      if (status && status.updated) {
        const parsedDate = Date.parse(status.updated)
        // Watchdog interval is 2 seconds, allow an extra 8 seconds to pass before allowing a new instance to start after a dirty shutdown
        if (new Date().getTime() - parsedDate > 20000) {
          // Everything is ok, this is definitely a stale file, just continue
        } else {
          console.warn(`An active status file were found at '${statusFile}', pup already running. Exiting.`)
          Deno.exit(1)
        }
      } else {
        console.warn(`WARNING! A broken status file were found at '${statusFile}', there could be an existing instance of pup running, continuing anyway.`)
      }
    }
  }

  /**
   * Ready to start pup!
   */
  try {
    const pup = new Pup(configuration, configFile ?? undefined)

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
