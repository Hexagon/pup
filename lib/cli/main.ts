/**
 * Exports main function of Pup cli entrypoint
 *
 * @file      lib/cli/main.ts
 * @license   MIT
 */

// Import core dependencies
import { Pup } from "../core/pup.ts"
import { type Configuration, DEFAULT_REST_API_HOSTNAME, DEFAULT_REST_API_PORT, generateConfiguration, validateConfiguration } from "../core/configuration.ts"

// Import CLI utilities
import { printFlags, printHeader, printUsage } from "./output.ts"
import { checkArguments, parseArguments } from "./args.ts"
import { appendConfigurationFile, createConfigurationFile, findConfigFile, removeFromConfigurationFile } from "./config.ts"
import { printStatus } from "./status.ts"
import { upgrade } from "./upgrade.ts"

// Import common utilities
import { toPersistentPath, toResolvedAbsolutePath } from "../common/utils.ts"
import { exists, readFile } from "@cross/fs"

// Import external dependencies
import JSON5 from "json5"
import * as path from "@std/path"
import { Logger } from "../core/logger.ts"

import { args } from "@cross/utils/args"

import { installService, uninstallService } from "@cross/service"
import { Colors, exit } from "@cross/utils"
import { chdir, cwd } from "@cross/fs"
import { Secret } from "../core/secret.ts"
import { GenerateToken } from "../common/token.ts"
import { RestClient } from "../common/restclient.ts"
import { ApiApplicationState } from "../core/api.ts"
import { CurrentRuntime, Runtime } from "@cross/runtime"

/**
 * Define the main entry point of the CLI application
 *
 * @private
 * @async
 */
async function main() {
  /**
   * Read and validate CLI arguments
   * - Exit on error
   */
  let checkedArgs, checkedArgsError
  try {
    checkedArgs = checkArguments(parseArguments(args()))
  } catch (e) {
    checkedArgsError = e
  }
  if (!checkedArgs || checkedArgsError) {
    console.error(`Invalid combination of arguments: ${checkedArgsError.message}`)
    return exit(1)
  }
  // Handle that cmd can be specified using both `--cmd <command>` and `-- <command>`
  let cmd = checkedArgs.get("cmd")
  if (!cmd && checkedArgs.hasRest()) {
    cmd = checkedArgs.getRest()
  }
  // Extract base arguments
  const baseArgument = checkedArgs.countLoose() ? checkedArgs.getLoose()[0] : undefined
  const secondaryBaseArgument = checkedArgs.countLoose() > 1 ? checkedArgs.getLoose()[1] : undefined

  /**
   * Base arguments: setup, upgrade
   *
   * setup is a special command used as the pup installer, to install pup as a system cli command
   */
  const upgradeCondition = checkedArgs.get("setup") || baseArgument === "setup"
  const setupCondition = checkedArgs.get("upgrade") || baseArgument === "upgrade" || baseArgument === "update"
  if (upgradeCondition || setupCondition) {
    try {
      await upgrade(
        checkedArgs.get("version"),
        checkedArgs.get("channel"),
        checkedArgs.get("unsafely-ignore-certificate-errors"),
        checkedArgs.getBoolean("all-permissions"),
        checkedArgs.getBoolean("local"),
        setupCondition as boolean,
      )
    } catch (e) {
      console.error(`Could not ${setupCondition ? "enable-service" : "upgrade"} pup, error: ${e.message}`)
    }
    // upgrader(...) will normally handle exiting with signal 0, so we exit with code 1 if getting here
    exit(1)
  }

  /**
   * Base argument: version
   */
  if (checkedArgs.get("version") !== undefined || baseArgument === "version") {
    printHeader()
    exit(0)
  }

  /**
   * Base argument: help
   */
  if (checkedArgs.get("help") || !baseArgument || baseArgument === "help") {
    printUsage()
    console.log("")
    printFlags(checkedArgs.getBoolean("external-installer"))
    exit(0)
  }

  /**
   * Now either
   * - Use no configuration (--cmd or -- set) together with run
   * - Find configuration using (--config)
   * - Or generate configuration using (init)
   */
  const runWithoutConfig = baseArgument == "run" && (cmd !== undefined || checkedArgs.get("worker") !== undefined)
  const useConfigFile = !runWithoutConfig
  let configFile
  if (useConfigFile) {
    const configFileCwd = toResolvedAbsolutePath(checkedArgs?.get("cwd") || cwd())
    configFile = await findConfigFile(configFileCwd, useConfigFile, checkedArgs?.get("config"))
  }
  // Exit if a configuration file is expected, but not found
  if (useConfigFile && !configFile) {
    console.error("Configuration file not found.")
    exit(1)
  }
  // Change working directory to where the configuration file is, if there is one.
  if (useConfigFile && configFile) {
    try {
      const resolvedPath = path.parse(path.resolve(configFile))
      chdir(resolvedPath.dir)
      configFile = `${resolvedPath.name}${resolvedPath.ext}`
    } catch (e) {
      console.error(`Could not change working directory to path of '${configFile}, exiting. Message: `, e.message)
      exit(1)
    }
    // Change working directory to configured directory
  } else if (checkedArgs.get("cwd")) {
    // Change working directory of pup to whereever the configuration file is, change configFile to only contain file name
    try {
      const resolvedPath = path.parse(path.resolve(checkedArgs.get("cwd")!))
      chdir(resolvedPath.dir)
    } catch (e) {
      console.error(`Could not change working directory to path specified by --cwd ${checkedArgs.get("cwd")}, exiting. Message: `, e.message)
      return exit(1)
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
      return exit(1)
    }
  } else {
    configuration = generateConfiguration(
      checkedArgs.get("id") || "task",
      cmd!,
      checkedArgs.get("cwd"),
      checkedArgs.get("cron"),
      checkedArgs.get("terminate"),
      checkedArgs.getBoolean("autostart"),
      checkedArgs.get("watch"),
      checkedArgs.get("name"),
    )
  }
  // Prepare secret file
  let client
  let token
  let secret
  if (useConfigFile) {
    const secretFile = `${await toPersistentPath(configFile as string)}/.main.secret`
    // Get secret
    const secretInstance = new Secret(secretFile)
    try {
      secret = await secretInstance.loadOrGenerate()
    } catch (_e) {
      console.error("Could not connect to instance, secret could not be read.")
      return exit(1)
    }

    // Generate a short lived (2 minute) cli token
    token = await GenerateToken(secret, { consumer: "cli" }, new Date().getTime() + 120_000)

    // Send api request
    const apiBaseUrl = `http://${configuration.api?.hostname || DEFAULT_REST_API_HOSTNAME}:${configuration.api?.port || DEFAULT_REST_API_PORT}`
    client = new RestClient(apiBaseUrl, token!)
  }

  /**
   * Base argument: init
   *
   * Generate a new configuration file and exit
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
   * Base argument: init
   *
   * Generate a new configuration file and exit
   */
  if (baseArgument === "token") {
    if (secret) {
      const consumer = checkedArgs.get("consumer")
      let expiresAt
      const expiresInSeconds = checkedArgs.get("expire-in")
      if (expiresInSeconds) {
        expiresAt = Date.now() + (parseInt(expiresInSeconds, 10) * 1000)
      }
      const token = await GenerateToken(
        secret,
        { consumer }, // Include the consumer if provided
        expiresAt,
      )
      console.log("Token generated:")
      console.log("")
      console.log(token)
      console.log("")
      return exit(0)
    } else {
      console.error("Could not generate token. No secret found.")
      return exit(1)
    }
  }

  /**
   * Base argument: append
   *
   * Append configuration to existing configuration file and exit
   */
  if (baseArgument === "append") {
    if (configFile) {
      await appendConfigurationFile(configFile, checkedArgs!, cmd!)
      console.log(`Process '${checkedArgs.get("id")}' appended to configuration file '${configFile}'.`)
      exit(0)
    } else {
      console.log(`Configuration file '${configFile}' not found, use init if you want to create a new one. Exiting.`)
      exit(1)
    }
  }

  /**
   * Base argument: remove
   *
   * Remove process from existing configuration file and exit
   */
  if (baseArgument === "remove") {
    if (configFile) {
      await removeFromConfigurationFile(configFile, checkedArgs!)
      console.log(`Process '${checkedArgs.get("id")}' removed from configuration file '${configFile}'.`)
      exit(0)
    } else {
      console.log("Configuration file '${fallbackedConfigFile}' not found, use init if you want to create a new one. Exiting.")
      exit(1)
    }
  }

  /**
   * Base argument: enable-service
   */
  if (baseArgument === "enable-service") {
    if (!configFile) {
      console.error("Service maintenance commands require pup to run with a configuration file, exiting.")
      exit(1)
    }

    const system = checkedArgs.getBoolean("system")
    const name = checkedArgs.get("name") || configuration!.name || "pup"
    const config = checkedArgs.get("config")
    const cwd = checkedArgs.get("cwd")
    const cmd = `pup run ${config ? `--config ${config}` : ""}`
    const user = checkedArgs.get("user")
    const home = checkedArgs.get("home")
    const env = checkedArgs.getArray("env") || []

    try {
      const result = await installService({ system, name, cmd, cwd, user, home, env }, checkedArgs.getBoolean("dry-run"))
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
  }
  /**
   * Base argument: disable-service
   */
  if (baseArgument === "disable-service") {
    const system = checkedArgs.getBoolean("system")
    const name = checkedArgs.get("name") || configuration!.name || "pup"
    const home = checkedArgs.get("home")
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
      return exit(0)
    } catch (e) {
      console.error(`Could not uninstall service, error: ${e.message}`)
      return exit(1)
    }
  }

  /**
   * Base argument: monitor
   *
   * Starts a monitoring function, which connects to the REST API endpoint("/")
   * using websockets, and prints all received messages
   */
  if (baseArgument === "monitor") {
    const apiHostname = configuration.api?.hostname || DEFAULT_REST_API_HOSTNAME
    const apiPort = configuration.api?.port || DEFAULT_REST_API_PORT
    const wsUrl = `ws://${apiHostname}:${apiPort}/wss`

    const wss = new WebSocketStream(wsUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    })
    const { readable } = await wss.opened
    const reader = readable.getReader()
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      try {
        const v = JSON.parse(value.toString())
        const logWithColors = configuration!.logger?.colors ?? true
        const { processId, severity, category, timeStamp, text } = v.d
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
      } catch (_e) {
        console.error("Error in log streamer: " + _e)
      }
    }
    return
  }

  /**
   * Base argument: logs
   */
  if (baseArgument === "logs") {
    const logStore = `${await toPersistentPath(configFile as string)}/.main.log`
    const logger = new Logger(configuration!.logger || {}, logStore)
    const startTimestamp = checkedArgs.get("start") ? new Date(Date.parse(checkedArgs.get("start")!)).getTime() : undefined
    const endTimestamp = checkedArgs.get("end") ? new Date(Date.parse(checkedArgs.get("end")!)).getTime() : undefined
    const numberOfRows = checkedArgs.get("n") ? parseInt(checkedArgs.get("n")!, 10) : undefined
    let logs = await logger.getLogContents(checkedArgs.get("id"), startTimestamp, endTimestamp)
    logs = logs.filter((log) => {
      const { processId, severity } = log
      const severityFilter = !checkedArgs.get("severity") || checkedArgs.get("severity") === "" || checkedArgs.get("severity")!.toLowerCase() === severity.toLowerCase()
      const processFilter = !checkedArgs.get("id") || checkedArgs.get("id") === "" || checkedArgs.get("id")!.toLowerCase() === processId.toLowerCase()
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
    return exit(0)
  }

  /**
   * Base argument: status
   *
   * Print status for current running instance, and exit.
   */
  if (baseArgument === "status") {
    if (!client) {
      console.error("Can not print status, could not create api client.")
      return exit(1)
    }
    const responseState = await client.get("/state")
    if (responseState.ok) {
      const dataState: ApiApplicationState = await responseState.json()
      console.log("")
      printHeader()
      await printStatus(configFile!, configuration!, cwd(), dataState)
      exit(0)
      console.log("Action completed successfully")
      exit(0)
    } else {
      console.error("Action failed: Invalid response received.")
      exit(1)
    }
  }

  /**
   * Base arguments: restart, start, stop, block, unblock, terminate
   */
  for (const op of ["restart", "start", "stop", "block", "unblock", "terminate"]) {
    if (baseArgument === op && !secondaryBaseArgument && baseArgument !== "terminate") {
      console.error(`Control functions require an id, specify with '${baseArgument} all|<task-id>'`)
      exit(1)
    }
    if (baseArgument === op) {
      let url = `/${op.toLowerCase().trim()}`
      if (secondaryBaseArgument) {
        url = `/processes/${secondaryBaseArgument.toLocaleLowerCase().trim()}${url}`
      }
      const result = await client!.post(url, undefined)
      if (result.ok) {
        console.log("Action completed successfully")
        exit(0)
      } else {
        console.error("Action failed: Invalid response received.")
        exit(1)
      }
    }
  }

  /**
   * Base argument: run
   */
  if (baseArgument === "run") {
    /**
     * Error handling: Pup already running
     */
    try {
      const response = await client?.get("/state")
      if (response?.ok) {
        console.warn(`Pup already running. Exiting.`)
        exit(1)
      }
    } catch (_e) { /* Expected! ^*/ }

    /**
     * Error handling: Require at least one configured process
     */
    if (!configuration! || configuration?.processes?.length < 1) {
      console.error("No processes defined, exiting.")
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

      if (CurrentRuntime === Runtime.Deno) {
        // This is needed to trigger termination in Deno
        // as CTRL+C does not run the beforeunload event
        // See https://github.com/denoland/deno/issues/11752
        Deno.addSignalListener("SIGINT", async () => {
          await pup.terminate(30000)
        })
      }

      // Let program end gracefully, no exit here
    } catch (e) {
      console.error("Could not start pup, invalid configuration:", e.message)
      return exit(1)
    }
  } else {
    /**
     * Error handling: Unknown/missing base argument, no options left
     */
    console.error("Unknown operation.")
    return exit(1)
  }
}

export { main }
