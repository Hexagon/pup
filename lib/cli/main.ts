/**
 * Exports main function of Pup cli entrypoint
 *
 * @file      lib/cli/main.ts
 * @license   MIT
 */

// Import core dependencies
import { InstructionResponse, Pup } from "../core/pup.ts"
import { Configuration, generateConfiguration, validateConfiguration } from "../core/configuration.ts"
import { FileIPC } from "../common/ipc.ts"

// Import CLI utilities
import { printFlags, printHeader, printUsage } from "./output.ts"
import { checkArguments, parseArguments } from "./args.ts"
import { appendConfigurationFile, createConfigurationFile, findConfigFile, removeFromConfigurationFile } from "./config.ts"
import { getStatus, printStatus } from "./status.ts"
import { upgrade } from "./upgrade.ts"

// Import common utilities
import { fileExists, toPersistentPath, toTempPath } from "../common/utils.ts"

// Import external dependencies
import { installService, jsonc, path, uninstallService } from "../../deps.ts"
import { Logger } from "../core/logger.ts"

/**
 * Define the main entry point of the CLI application
 *
 * @private
 * @async
 */
async function main(inputArgs: string[]) {
  const args = parseArguments(inputArgs)

  // Extract base argument
  const baseArgument = args._.length > 0 ? args._[0] : undefined
  const secondaryBaseArgument = args._.length > 1 ? args._[1] : undefined

  /**
   * Begin with --version, --upgrade and --help, as they have no dependencies on other
   * arguments, and just exit
   */
  if (args.version || baseArgument === "version") {
    printHeader()
    Deno.exit(0)
  }

  if (args.upgrade !== undefined || baseArgument === "upgrade" || baseArgument === "update") {
    try {
      await upgrade(args.upgrade)
    } catch (e) {
      console.error(`Could not upgrade pup, error: ${e.message}`)
      Deno.exit(1)
    }
  }

  if (args.help || !baseArgument || baseArgument === "help") {
    printUsage()
    console.log("")
    printFlags()
    Deno.exit(0)
  }

  /**
   * check arguments
   */
  let checkedArgs
  try {
    checkedArgs = checkArguments(args)
  } catch (e) {
    console.error(`Invalid combination of arguments: ${e.message}`)
    Deno.exit(1)
  }

  // Extract command from arguments
  let cmd
  if (checkedArgs) {
    if (checkedArgs.cmd) {
      cmd = checkedArgs.cmd
    } else if (checkedArgs["--"] && checkedArgs["--"].length > 0) {
      cmd = checkedArgs["--"]
    }
  }

  // Extract worker from arguments
  const worker = checkedArgs.worker

  /**
   * Now either
   * - Use no configuration (--cmd or -- set) together with run
   * - Find configuration using (--config)
   * - Or generate configuration using (init)
   */
  const runWithoutConfig = baseArgument == "run" && (cmd !== undefined || worker !== undefined)
  const useConfigFile = !runWithoutConfig
  let configFile
  if (useConfigFile) {
    configFile = await findConfigFile(useConfigFile, checkedArgs.config, checkedArgs.cwd)
  }

  /**
   * Handle the install argument
   */
  if (baseArgument === "install") {
    if (!configFile) {
      console.error("Service maintenance commands require pup to run with a configuration file, exiting.")
      Deno.exit(1)
    }

    const system = args.system
    const name = args.name || "pup"
    const config = args.config
    const cwd = args.cwd
    const cmd = `pup run ${config ? `--config ${config}` : ""}`
    const user = args.user
    const home = args.home
    const env = args.env || []

    try {
      await installService({ system, name, cmd, cwd, user, home, env }, args["dry-run"])
      Deno.exit(0)
    } catch (e) {
      console.error(`Could not install service, error: ${e.message}`)
      Deno.exit(1)
    }
  } else if (baseArgument === "uninstall") {
    const system = args.system
    const name = args.name || "pup"
    const home = args.home

    try {
      await uninstallService({ system, name, home })
      console.log(`Service '${name}' uninstalled.`)
      Deno.exit(0)
    } catch (e) {
      console.error(`Could not uninstall service, error: ${e.message}`)
      Deno.exit(1)
    }
  }

  /**
   * Now, handle the argument to generate a new configuration file and exit
   */
  if (baseArgument === "init") {
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

  /**
   * Now, the arguments to modify existing configuration files and exit
   * - append - Append configuration to existing configuration file and exit
   * - remove - Remove process from existing configuration file and exit
   */
  if (baseArgument === "append") {
    if (configFile) {
      await appendConfigurationFile(configFile, checkedArgs, cmd)
      console.log(`Process '${args.id}' appended to configuration file '${configFile}'.`)
      Deno.exit(0)
    } else {
      console.log(`Configuration file '${configFile}' not found, use init if you want to create a new one. Exiting.`)
      Deno.exit(1)
    }
  }

  if (baseArgument === "remove") {
    if (configFile) {
      await removeFromConfigurationFile(configFile, checkedArgs)
      console.log(`Process '${args.id}' removed from configuration file '${configFile}'.`)
      Deno.exit(0)
    } else {
      console.log("Configuration file '${fallbackedConfigFile}' not found, use init if you want to create a new one. Exiting.")
      Deno.exit(1)
    }
  }

  // Exit if no configuration file was found, or specified configuration file were not found
  if (useConfigFile && !configFile) {
    console.error("Configuration file not found.")
    Deno.exit(1)
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
    } catch (_e) {
      console.error(`Could not start, error reading or parsing configuration file '${configFile}'`)
      Deno.exit(1)
    }
  } else {
    configuration = generateConfiguration(args.id || "task", cmd, args.cwd, args.cron, args.terminate, args.autostart, args.watch)

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

  // Prepare log file path
  // Add a new condition for "logs" base command
  if (baseArgument === "logs") {
    const logStore = `${toPersistentPath(configFile as string)}/.main.log`
    const logger = new Logger(configuration.logger || {}, logStore)
    const startTimestamp = args.start ? new Date(Date.parse(args.start)).getTime() : undefined
    const endTimestamp = args.end ? new Date(Date.parse(args.end)).getTime() : undefined
    const numberOfRows = args.n ? parseInt(args.n, 10) : undefined
    let logs = await logger.getLogContents(args.id, startTimestamp, endTimestamp)
    logs = logs.filter((log) => {
      const { processId, severity } = log
      const severityFilter = !args.severity || args.severity.toLowerCase() === severity.toLowerCase()
      const processFilter = !args.id || args.id.toLowerCase() === processId.toLowerCase()
      return severityFilter && processFilter
    })
    if (numberOfRows) {
      logs = logs.slice(-numberOfRows)
    }
    if (logs && logs.length > 0) {
      const logWithColors = configuration.logger?.colors ?? true
      for (const log of logs) {
        const { processId, severity, category, timeStamp, text } = log
        const isStdErr = severity === "error" || category === "stderr"
        const decoratedLogText = `${new Date(timeStamp).toISOString()} [${severity.toUpperCase()}] [${processId}:${category}] ${text}`
        let color = null
        // Apply coloring rules
        if (logWithColors) {
          if (processId === "core") color = "gray"
          if (category === "starting") color = "green"
          if (category === "finished") color = "yellow"
          if (isStdErr) color = "red"
        }
        let logFn = console.log
        if (severity === "warn") logFn = console.warn
        if (severity === "info") logFn = console.info
        if (severity === "error") logFn = console.error
        if (color !== null) {
          logFn(`%c${decoratedLogText}`, `color: ${color}`)
        } else {
          logFn(decoratedLogText)
        }
      }
    } else {
      console.error("No logs found.")
    }
    Deno.exit(0)
  }

  // Prepare for IPC
  let ipcFile
  if (useConfigFile) ipcFile = `${toTempPath(configFile as string)}/.main.ipc`

  // Prepare status file
  let statusFile
  if (useConfigFile) statusFile = `${toPersistentPath(configFile as string)}/.main.status`

  /**
   * Now when the configuration file is located
   * status, print status for current running instance, and exit.
   */
  if (baseArgument === "status") {
    if (!statusFile || !configFile) {
      console.error("Can not print status, no configuration file found")
      Deno.exit(1)
    }
    console.log("")
    printHeader()
    await printStatus(configFile, statusFile)
    Deno.exit(0)
  }

  // Handle --restart, --stop etc using IPC
  for (const op of ["restart", "start", "stop", "block", "unblock", "terminate"]) {
    if (baseArgument === op && !secondaryBaseArgument && baseArgument !== "terminate") {
      console.error(`Control functions require an id, specify with '${baseArgument} all|<task-id>'`)
      Deno.exit(1)
    }
    if (baseArgument === op) {
      // If status file doesn't exist, don't even try to communicate
      try {
        if (await getStatus(configFile, statusFile) && ipcFile) {
          const ipc = new FileIPC(ipcFile)
          const senderId = crypto.randomUUID()

          const responseFile = `${ipcFile}.${senderId}`
          const ipcResponse = new FileIPC(responseFile)

          await ipc.sendData(JSON.stringify({ [op]: secondaryBaseArgument || true, senderUuid: senderId }))

          const responseTimeout = setTimeout(() => {
            console.error("Response timeout after 10 seconds")
            Deno.exit(1)
          }, 10000) // wait at most 10 seconds

          for await (const message of ipcResponse.receiveData()) {
            clearTimeout(responseTimeout) // clear the timeout when a response is received
            if (message.length > 0 && message[0].data) {
              const parsedMessage: InstructionResponse = JSON.parse(message[0].data)
              if (parsedMessage.success) {
                console.log("Action completed successfully")
              } else {
                console.error("Action failed.")
                Deno.exit(1)
              }
            } else {
              console.error("Action failed: Invalid response received.")
              Deno.exit(1)
            }

            break // break out of the loop after receiving the response
          }

          Deno.exit(0)
        } else {
          console.error(`No running instance found, cannot send command '${op}' over IPC.`)
          Deno.exit(1)
        }
      } catch (e) {
        console.error(e.message)
        Deno.exit(1)
      }
    }
  }

  /**
   * handle the case where there is an existing status file
   */
  if (statusFile && await fileExists(statusFile)) {
    try {
      // A valid status file were found
      if (!await getStatus(configFile, statusFile)) {
        /* ignore */
      } else {
        console.warn(`An active status file were found at '${statusFile}', pup already running. Exiting.`)
        Deno.exit(1)
      }
    } catch (e) {
      console.error(e.message)
      Deno.exit(1)
    }
  }

  /**
   * One last check before starting, is there any processes?
   */
  if (!configuration || configuration?.processes?.length < 1) {
    console.error("No processes defined, exiting.")
    Deno.exit(1)
  }

  /**
   * Ready to start pup!
   */
  if (baseArgument !== "run") {
    console.error("Trying to start pup without 'run' argument, this should not happen. Exiting.")
    Deno.exit(1)
  }

  try {
    const pup = new Pup(configuration, configFile ?? undefined)

    // Start the watchdog
    pup.init()

    // Register for running pup.terminate() if not already run on clean exit
    let hasRunShutdownCode = false
    globalThis.addEventListener("beforeunload", (evt) => {
      if (!hasRunShutdownCode) {
        evt.preventDefault()
        hasRunShutdownCode = true
        ;(async () => await pup.terminate(30000))()
      }
    })

    // This is needed to trigger termination, as CTRL+C
    // does not run the beforeunload event
    // See https://github.com/denoland/deno/issues/11752
    Deno.addSignalListener("SIGINT", async () => {
      await pup.terminate(30000)
    })

    // Let program end gracefully, no Deno.exit here
  } catch (e) {
    console.error("Could not start pup, invalid configuration:", e.message)
    Deno.exit(1)
  }
}

export { main }
