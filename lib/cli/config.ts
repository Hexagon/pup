/**
 * Exports helper functions to find, create and modify pup configuration file
 * Belongs to Pup cli entrypoint
 *
 * @file      lib/cli/config.ts
 * @license   MIT
 */

import { type Configuration, generateConfiguration, type ProcessConfiguration } from "../core/configuration.ts"
import JSON5 from "json5"
import { join } from "@std/path"
import { exists, readFile, writeFile } from "@cross/fs"
import type { ArgsParser } from "@cross/utils"
import { toResolvedAbsolutePath } from "@pup/common/path"
import { exit } from "node:process"

/**
 * Helper which creates a configuration file from command line arguments
 *
 * @private
 * @async
 */
export async function createConfigurationFile(configFile: string, checkedArgs: ArgsParser, cmd: string) {
  try {
    const config = generateConfiguration(
      checkedArgs.get("id")!,
      cmd,
      checkedArgs.get("cwd"),
      checkedArgs.get("cron"),
      checkedArgs.get("terminate"),
      checkedArgs.getBoolean("autostart"),
      checkedArgs.get("watch"),
      checkedArgs.get("name"),
      checkedArgs.get("instances"),
      checkedArgs.get("start-port"),
      checkedArgs.get("common-port"),
      checkedArgs.get("strategy"),
      checkedArgs.get("stdout"),
      checkedArgs.get("stderr"),
    )
    await writeFile(configFile, JSON.stringify(config, null, 2))
  } catch (e) {
    console.error("Could not create/write configuration file: ", e)
    exit(1)
  }
}

/**
 * Helper which appends a process to an existing configuration file from using command line arguments
 *
 * @private
 * @async
 */
export async function appendConfigurationFile(configFile: string, checkedArgs: ArgsParser, cmd: string) {
  try {
    // Read existing configuration
    let existingConfigurationObject
    try {
      const existingConfiguration = await readFile(configFile)
      const existingConfigurationText = new TextDecoder().decode(existingConfiguration)
      existingConfigurationObject = JSON5.parse(existingConfigurationText) as unknown as Configuration
    } catch (e) {
      throw new Error("Could not read configuration file: " + (e instanceof Error ? e.message : "Unknown"))
    }

    // Check for valid parse
    if (!existingConfigurationObject) {
      throw new Error("Could not parse configuration file.")
    }

    // Generate new configuration
    const newConfiguration = generateConfiguration(
      checkedArgs.get("id")!,
      cmd,
      checkedArgs.get("cwd"),
      checkedArgs.get("cron"),
      checkedArgs.get("terminate"),
      checkedArgs.getBoolean("autostart"),
      checkedArgs.get("watch"),
      checkedArgs.get("name"),
      checkedArgs.get("instances"),
      checkedArgs.get("start-port"),
      checkedArgs.get("common-port"),
      checkedArgs.get("strategy"),
      checkedArgs.get("stdout"),
      checkedArgs.get("stderr"),
    )
    const newProcess = newConfiguration.processes[0]

    // Check that task id does not already exist
    const alreadyExists = existingConfigurationObject.processes?.find((p: ProcessConfiguration) => p?.id === newProcess?.id)
    if (alreadyExists) {
      throw new Error(`Process id '${newProcess?.id}' already exists, exiting.`)
    }

    // Append new process, and write configuration file
    existingConfigurationObject.processes.push(newConfiguration.processes[0])
    await writeFile(configFile, JSON.stringify(existingConfigurationObject, null, 2))
  } catch (_e) {
    console.error(`Could not modify configuration file '${configFile}'`)
    exit(1)
  }
}

/**
 * Helper which removes a process from an existing configuration file from using command line arguments
 *
 * @async
 */
export async function removeFromConfigurationFile(configFile: string, checkedArgs: ArgsParser) {
  try {
    // Read existing configuration
    let existingConfigurationObject
    try {
      const existingConfiguration = await readFile(configFile)
      const existingConfigurationText = new TextDecoder().decode(existingConfiguration)
      existingConfigurationObject = JSON5.parse(existingConfigurationText) as unknown as Configuration
    } catch (_e) {
      throw new Error("Could not read configuration file.")
    }

    if (!existingConfigurationObject) {
      throw new Error("Could not parse configuration file.")
    }

    // Remove from configuration
    const alreadyExists = existingConfigurationObject.processes?.find((p: ProcessConfiguration) => p?.id === checkedArgs.get("id"))
    if (!alreadyExists) {
      throw new Error(`Process id '${checkedArgs.get("id")}' not found, exiting.`)
    }

    // Filter out
    existingConfigurationObject.processes = existingConfigurationObject.processes.filter((p: ProcessConfiguration) => p?.id !== checkedArgs.get("id"))

    // Append new process, and write configuration file
    await writeFile(configFile, JSON.stringify(existingConfigurationObject, null, 2))
  } catch (e) {
    console.error(`Could not modify configuration file ${configFile}: `, e instanceof Error ? e.message : "Unknown")
    exit(1)
  }
}

/**
 * Helper which tries to find the configuration file
 * if it was not specified in the command line arguments
 *
 * @async
 */
export async function findConfigFile(cwd: string, useConfigFile?: boolean, argumentsConfigFile?: string): Promise<string | undefined> {
  // If not using config file, return undefined
  if (!useConfigFile) return undefined

  // If config file was specified in arguments, return it or throw if it does not exist
  if (argumentsConfigFile) {
    const resolvedPath = toResolvedAbsolutePath(argumentsConfigFile)
    if (await exists(resolvedPath)) {
      return resolvedPath
    } else {
      throw new Error("Specified configuration file does not exist.")
    }
  }

  // Try to find configuration file, JSON5 first. Take cwd into account.
  let jsonPath = "./pup.json"
  let jsoncPath = "./pup.jsonc"
  if (cwd) {
    jsonPath = join(toResolvedAbsolutePath(cwd), jsonPath)
    jsoncPath = join(toResolvedAbsolutePath(cwd), jsoncPath)
  }
  if (await exists(jsoncPath)) {
    return jsoncPath
  } else {
    return jsonPath
  }
}
