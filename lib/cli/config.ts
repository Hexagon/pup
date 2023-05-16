/**
 * Exports helper functions to find, create and modify pup configuration file
 * Belongs to Pup cli entrypoint
 *
 * @file      lib/cli/config.ts
 * @license   MIT
 */

import { Configuration, generateConfiguration, ProcessConfiguration } from "../core/configuration.ts"
import { Args, join, jsonc, resolve } from "../../deps.ts"
import { fileExists } from "../common/utils.ts"

/**
 * Helper which creates a configuration file from command line arguments
 *
 * @private
 * @async
 */
export async function createConfigurationFile(configFile: string, checkedArgs: Args, cmd: string) {
  try {
    const config = generateConfiguration(
      checkedArgs.id,
      cmd,
      checkedArgs.cwd,
      checkedArgs.cron,
      checkedArgs.terminate,
      checkedArgs.autostart,
      checkedArgs.watch,
      checkedArgs.instances,
      checkedArgs["start-port"],
      checkedArgs["common-port"],
      checkedArgs.strategy,
      checkedArgs.stdout,
      checkedArgs.stderr,
    )
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
export async function appendConfigurationFile(configFile: string, checkedArgs: Args, cmd: string) {
  try {
    // Read existing configuration
    let existingConfigurationObject
    try {
      const existingConfiguration = await Deno.readTextFile(configFile)
      existingConfigurationObject = jsonc.parse(existingConfiguration) as unknown as Configuration
    } catch (e) {
      throw new Error("Could not read configuration file: " + e.message)
    }

    // Check for valid parse
    if (!existingConfigurationObject) {
      throw new Error("Could not parse configuration file.")
    }

    // Generate new configuration
    const newConfiguration = generateConfiguration(
      checkedArgs.id,
      cmd,
      checkedArgs.cwd,
      checkedArgs.cron,
      checkedArgs.terminate,
      checkedArgs.autostart,
      checkedArgs.watch,
      checkedArgs.instances,
      checkedArgs["start-port"],
      checkedArgs["common-port"],
      checkedArgs.strategy,
      checkedArgs.stdout,
      checkedArgs.stderr,
    )
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
 * @async
 */
export async function removeFromConfigurationFile(configFile: string, checkedArgs: Args) {
  try {
    // Read existing configuration
    let existingConfigurationObject
    try {
      const existingConfiguration = await Deno.readTextFile(configFile)
      existingConfigurationObject = jsonc.parse(existingConfiguration) as unknown as Configuration
    } catch (e) {
      throw new Error("Could not read configuration file.", e.message)
    }

    if (!existingConfigurationObject) {
      throw new Error("Could not parse configuration file.")
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
 * @async
 */
export async function findConfigFile(useConfigFile?: boolean, argumentsConfigFile?: string, cwd?: string): Promise<string | undefined> {
  // If not using config file, return undefined
  if (!useConfigFile) return undefined

  // If config file was specified in arguments, return it or throw if it does not exist
  if (argumentsConfigFile) {
    const resolvedPath = resolve(argumentsConfigFile)
    if (await fileExists(resolvedPath)) {
      return resolvedPath
    } else {
      throw new Error("Specified configuration file does not exist.")
    }
  }

  // Try to find configuration file, jsonc first. Take cwd into account.
  let jsonPath = "./pup.json"
  let jsoncPath = "./pup.jsonc"
  if (cwd) {
    jsonPath = join(resolve(cwd), jsonPath)
    jsoncPath = join(resolve(cwd), jsoncPath)
  }
  if (await fileExists(jsoncPath)) {
    return jsoncPath
  } else {
    return jsonPath
  }
}
