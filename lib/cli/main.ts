/**
 * Exports main function of Pup cli entrypoint
 *
 * @file      lib/cli/main.ts
 * @license   MIT
 */

// Import core dependencies
import { type InstructionResponse, Pup } from "../core/pup.ts"
import { type Configuration, generateConfiguration, validateConfiguration } from "../core/configuration.ts"
import { FileIPC } from "../common/ipc.ts"

// Import CLI utilities
import { printFlags, printHeader, printUsage } from "./output.ts"
import { checkArguments, parseArguments } from "./args.ts"
import { appendConfigurationFile, createConfigurationFile, findConfigFile, removeFromConfigurationFile } from "./config.ts"
import { getStatus, printStatus } from "./status.ts"
import { upgrade } from "./upgrade.ts"

// Import common utilities
import { toPersistentPath, toResolvedAbsolutePath, toTempPath } from "../common/utils.ts"
import { exists, readFile } from "@cross/fs"

// Import external dependencies
import JSON5 from "json5"
import * as path from "@std/path"
import { Logger } from "../core/logger.ts"

import { args } from "@cross/utils/args"

import { installService, uninstallService } from "@cross/service"
import { Colors, exit } from "@cross/utils"
import { chdir, cwd } from "@cross/fs"

/**
 * Define the main entry point of the CLI application
 *
 * @private
 * @async
 */
async function main() {
  const parsedArgs = parseArguments(args())

  // Extract base argument
  const baseArgument = parsedArgs.countLoose() ? parsedArgs.getLoose()[0] : undefined
  const secondaryBaseArgument = parsedArgs.countLoose() > 1 ? parsedArgs.getLoose()[1] : undefined

  /**
   * setup, upgrade
   *
   * setup is a special command used as the pup installer, to install pup as a system cli command
   */
  const upgradeCondition = parsedArgs.get("setup") || baseArgument === "setup"
  const setupCondition = parsedArgs.get("upgrade") || baseArgument === "upgrade" || baseArgument === "update"
  if (upgradeCondition || setupCondition) {
    try {
      await upgrade(
        parsedArgs.get("version"),
        parsedArgs.get("channel"),
        parsedArgs.get("unsafely-ignore-certificate-errors"),
        parsedArgs.getBoolean("all-permissions"),
        parsedArgs.getBoolean("local"),
        setupCondition as boolean,
      )
    } catch (e) {
      console.error(`Could not ${setupCondition ? "enable-service" : "upgrade"} pup, error: ${e.message}`)
    }
    // upgrader(...) will normally handle exiting with signal 0, so we exit with code 1 if getting here
    exit(1)
  }

  /**
   * version
   */
  if (parsedArgs.get("version") !== undefined || baseArgument === "version") {
    printHeader()
    exit(0)
  }

  /**
   * help
   */
  if (parsedArgs.get("help") || !baseArgument || baseArgument === "help") {
    printUsage()
    console.log("")
    printFlags(parsedArgs.getBoolean("external-installer"))
    exit(0)
  }

  /**
   * check arguments
   */
  let checkedArgs
  try {
    checkedArgs = checkArguments(parsedArgs)
  } catch (e) {
    console.error(`Invalid combination of arguments: ${e.message}`)
    exit(1)
  }

  // Extract command from arguments
  let cmd
  if (checkedArgs) {
    if (checkedArgs.get("cmd")) {
      cmd = checkedArgs.get("cmd")
    } else if (checkedArgs.hasRest()) {
      cmd = checkedArgs.getRest()
    }
  }

  // Extract worker from arguments
  const worker = checkedArgs?.get("worker")

  /**
   * Now either
   * - Use no configuration (--cmd or -- set) together with run
   * - Find configuration using (--config)
   * - Or generate configuration using (init)
   */
  const runWithoutConfig = baseArgument == "foreground" && (cmd !== undefined || worker !== undefined)
  const useConfigFile = !runWithoutConfig
  let configFile
  if (useConfigFile) {
    const configFileCwd = toResolvedAbsolutePath(checkedArgs?.get("cwd") || cwd())
    configFile = await findConfigFile(configFileCwd, useConfigFile, checkedArgs?.get("config"))
  }
  ""
  /**
   * Handle the install argument
   */
  if (baseArgument === "enable-service") {
    if (!configFile) {
      console.error("Service maintenance commands require pup to run with a configuration file, exiting.")
      exit(1)
    }

    const system = parsedArgs.getBoolean("system")
    const name = parsedArgs.get("name") || "pup"
    const config = parsedArgs.get("config")
    const cwd = parsedArgs.get("cwd")
    const cmd = `pup foreground ${config ? `--config ${config}` : ""}`
    const user = parsedArgs.get("user")
    const home = parsedArgs.get("home")
    const env = parsedArgs.getArray("env") || []

    try {
      const result = await installService({ system, name, cmd, cwd, user, home, env }, parsedArgs.getBoolean("dry-run"))
      if (result.manualSteps && result.manualSteps.length) {
        console.log(Colors.bold("To complete the installation, carry out these manual steps:"))
        result.manualSteps.forEach((step, index) => {
          console.log(Colors.cyan(`${index + 1}. ${step.text}`))
          if (step.command) {
            console.log("   " + Colors.yellow("Command: ") + step.command)
          }
        })
      } else {
        console.log(`Service ´${name}' successfully installed at '${result.servicePath}'.`)
      }
      exit(0)
    } catch (e) {
      console.error(`Could not install service, error: ${e.message}`)
      exit(1)
    }
  } else if (baseArgument === "disable-service") {
    const system = parsedArgs.getBoolean("system")
    const name = parsedArgs.get("name") || "pup"
    const home = parsedArgs.get("home")
    try {
      const result = await uninstallService({ system, name, home })
      if (result.manualSteps && result.manualSteps.length) {
        console.log(Colors.bold("To complete the uninstallation, carry out these manual steps:"))
        result.manualSteps.forEach((step, index) => {
          console.log(Colors.cyan(`${index + 1}. ${step.text}`))
          if (step.command) {
            console.log("   " + Colors.yellow("Command: ") + step.command)
          }
        })
      } else {
        console.log(`Service '${name}' at '${result.servicePath}' is now uninstalled.`)
      }
      exit(0)
    } catch (e) {
      console.error(`Could not uninstall service, error: ${e.message}`)
      exit(1)
    }
  }

  /**
   * Now, handle the argument to generate a new configuration file and exit
   */
  if (baseArgument === "init") {
    // Default new configuration file to pup.json
    const fallbackedConfigFile = configFile ?? "pup.json"
    if (await exists(fallbackedConfigFile)) {
      console.error(`Configuration file '${fallbackedConfigFile}' already exists, exiting.`)
      exit(1)
    } else {
      await createConfigurationFile(fallbackedConfigFile, checkedArgs!, cmd!)
      console.log(`Configuration file '${fallbackedConfigFile}' created`)
      exit(0)
    }
  }

  /**
   * Now, the arguments to modify existing configuration files and exit
   * - append - Append configuration to existing configuration file and exit
   * - remove - Remove process from existing configuration file and exit
   */
  if (baseArgument === "append") {
    if (configFile) {
      await appendConfigurationFile(configFile, checkedArgs!, cmd!)
      console.log(`Process '${parsedArgs.get("id")}' appended to configuration file '${configFile}'.`)
      exit(0)
    } else {
      console.log(`Configuration file '${configFile}' not found, use init if you want to create a new one. Exiting.`)
      exit(1)
    }
  }

  if (baseArgument === "remove") {
    if (configFile) {
      await removeFromConfigurationFile(configFile, checkedArgs!)
      console.log(`Process '${parsedArgs.get("id")}' removed from configuration file '${configFile}'.`)
      exit(0)
    } else {
      console.log("Configuration file '${fallbackedConfigFile}' not found, use init if you want to create a new one. Exiting.")
      exit(1)
    }
  }

  // Exit if no configuration file was found, or specified configuration file were not found
  if (useConfigFile && !configFile) {
    console.error("Configuration file not found.")
    exit(1)
  }

  /**
   * Change working directory to where the configuration file is, if there is one.
   */
  if (useConfigFile && configFile) {
    try {
      const resolvedPath = path.parse(path.resolve(configFile))
      chdir(resolvedPath.dir)
      configFile = `${resolvedPath.name}${resolvedPath.ext}`
    } catch (e) {
      console.error(`Could not change working directory to path of '${configFile}, exiting. Message: `, e.message)
      exit(1)
    }
  }

  // Read or generate configuration
  let configuration: Configuration
  if (configFile) {
    try {
      const rawConfig = await readFile(configFile)
      const rawConfigText = new TextDecoder().decode(rawConfig)
      configuration = validateConfiguration(JSON5.parse(rawConfigText))
    } catch (e) {
      console.error(`Could not start, error reading or parsing configuration file '${configFile}': ${e.message}`)
      exit(1)
    }
  } else {
    configuration = generateConfiguration(
      parsedArgs.get("id") || "task",
      cmd!,
      parsedArgs.get("cwd"),
      parsedArgs.get("cron"),
      parsedArgs.get("terminate"),
      parsedArgs.getBoolean("autostart"),
      parsedArgs.get("watch"),
    )

    // Change working directory to configuration file directory
    if (parsedArgs.get("cwd")) {
      // Change working directory of pup to whereever the configuration file is, change configFile to only contain file name
      try {
        const resolvedPath = path.parse(path.resolve(parsedArgs.get("cwd")!))
        chdir(resolvedPath.dir)
      } catch (e) {
        console.error(`Could not change working directory to path specified by --cwd ${parsedArgs.get("cwd")}, exiting. Message: `, e.message)
        exit(1)
      }
    }
  }

  // Prepare log file path
  // Add a new condition for "logs" base command
  if (baseArgument === "logs") {
    const logStore = `${await toPersistentPath(configFile as string)}/.main.log`
    const logger = new Logger(configuration!.logger || {}, logStore)
    const startTimestamp = parsedArgs.get("start") ? new Date(Date.parse(parsedArgs.get("start")!)).getTime() : undefined
    const endTimestamp = parsedArgs.get("end") ? new Date(Date.parse(parsedArgs.get("end")!)).getTime() : undefined
    const numberOfRows = parsedArgs.get("n") ? parseInt(parsedArgs.get("n")!, 10) : undefined
    let logs = await logger.getLogContents(parsedArgs.get("id"), startTimestamp, endTimestamp)
    logs = logs.filter((log) => {
      const { processId, severity } = log
      const severityFilter = !parsedArgs.get("severity") || parsedArgs.get("severity") === "" || parsedArgs.get("severity")!.toLowerCase() === severity.toLowerCase()
      const processFilter = !parsedArgs.get("id") || parsedArgs.get("id") === "" || parsedArgs.get("id")!.toLowerCase() === processId.toLowerCase()
      return severityFilter && processFilter
    })
    if (numberOfRows) {
      logs = logs.slice(-numberOfRows)
    }
    if (logs && logs.length > 0) {
      const logWithColors = configuration!.logger?.colors ?? true
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
    exit(0)
  }

  // Prepare for IPC
  let ipcFile
  if (useConfigFile) ipcFile = `${await toTempPath(configFile as string)}/.main.ipc`

  // Prepare status file
  let statusFile
  if (useConfigFile) statusFile = `${await toPersistentPath(configFile as string)}/.main.status`

  /**
   * Now when the configuration file is located
   * status, print status for current running instance, and exit.
   */
  if (baseArgument === "status") {
    if (!statusFile || !configFile) {
      console.error("Can not print status, no configuration file found")
      exit(1)
    }
    console.log("")
    printHeader()
    await printStatus(configFile!, statusFile!)
    exit(0)
  }

  // Handle --restart, --stop etc using IPC
  for (const op of ["restart", "start", "stop", "block", "unblock", "terminate"]) {
    if (baseArgument === op && !secondaryBaseArgument && baseArgument !== "terminate") {
      console.error(`Control functions require an id, specify with '${baseArgument} all|<task-id>'`)
      exit(1)
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
            exit(1)
          }, 10000) // wait at most 10 seconds

          for await (const message of ipcResponse.receiveData()) {
            clearTimeout(responseTimeout) // clear the timeout when a response is received
            if (message.length > 0 && message[0].data) {
              const parsedMessage: InstructionResponse = JSON.parse(message[0].data)
              if (parsedMessage.success) {
                console.log("Action completed successfully")
              } else {
                console.error("Action failed.")
                exit(1)
              }
            } else {
              console.error("Action failed: Invalid response received.")
              exit(1)
            }

            break // break out of the loop after receiving the response
          }

          exit(0)
        } else {
          console.error(`No running instance found, cannot send command '${op}' over IPC.`)
          exit(1)
        }
      } catch (e) {
        console.error(e.message)
        exit(1)
      }
    }
  }

  /**
   * handle the case where there is an existing status file
   */
  if (statusFile && await exists(statusFile)) {
    try {
      // A valid status file were found
      if (!await getStatus(configFile, statusFile)) {
        /* ignore */
      } else {
        console.warn(`An active status file were found at '${statusFile}', pup already running. Exiting.`)
        exit(1)
      }
    } catch (e) {
      console.error(e.message)
      exit(1)
    }
  }

  /**
   * One last check before starting, is there any processes?
   */
  if (!configuration! || configuration?.processes?.length < 1) {
    console.error("No processes defined, exiting.")
    exit(1)
  }

  /**
   * Ready to start pup!
   */
  if (baseArgument !== "foreground") {
    console.error("Trying to start pup without 'foreground' argument, this should not happen. Exiting.")
    exit(1)
  }

  try {
    const pup = await Pup.init(configuration!, configFile ?? undefined)

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

    // Let program end gracefully, no exit here
  } catch (e) {
    console.error("Could not start pup, invalid configuration:", e.message)
    exit(1)
  }
}

export { main }
