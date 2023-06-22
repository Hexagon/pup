/**
 * Common utility functions for Pup
 *
 * @file lib/common/utils.ts
 * @license MIT
 */

import { path } from "../../deps.ts"

/**
 * Check if a file exists.
 * @async
 * @function
 * @param {string} filePath - The path to the file to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the file exists, false otherwise.
 * @throws {Error} Throws an error if an error occurs other than the file not being found.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const statResult = await Deno.stat(filePath)
    if (statResult.isFile) {
      return true
    } else {
      return false
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return false
    } else {
      throw e
    }
  }
}

/**
 * Check if a directory exists.
 * @async
 * @function
 * @param {string} dirPath - The path to the directory to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the directory exists, false otherwise.
 * @throws {Error} Throws an error if an error occurs other than the directory not being found.
 */
export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const statResult = await Deno.stat(dirPath)
    if (statResult.isDirectory) {
      return true
    } else {
      return false
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return false
    } else {
      throw e
    }
  }
}

/**
 * Generate a temporary path for the instance of a given configuration file.
 * @function
 * @param {string} configFile - The path to the configuration file.
 * @returns {string} The temporary path associated with the configuration file.
 */
export async function toTempPath(configFile: string) {
  const resolvedPath = path.parse(path.resolve(configFile))
  const tempPath = path.resolve(`${resolvedPath.dir}/.${resolvedPath.name}${resolvedPath.ext}-tmp`)
  await Deno.mkdir(tempPath, { recursive: true })
  return tempPath
}

/**
 * Generate a persistent storage path for the instance started by a given configuration file.
 * @function
 * @param {string} configFile - The path to the configuration file.
 * @returns {string} The persistent storage path associated with the configuration file.
 */
export async function toPersistentPath(configFile: string) {
  const resolvedPath = path.parse(path.resolve(configFile))
  const persistentStoragePath = path.resolve(`${resolvedPath.dir}/.${resolvedPath.name}${resolvedPath.ext}-data`)
  await Deno.mkdir(persistentStoragePath, { recursive: true })
  return persistentStoragePath
}
