/**
 * Common utility functions for Pup
 *
 * @file lib/common/utils.ts
 * @license MIT
 */

import { isAbsolute, parse, resolve } from "@std/path"
import { cwd, mkdir } from "@cross/fs"

export function toResolvedAbsolutePath(path: string, cwdInput?: string) {
  const cwdToUse = cwdInput || cwd()
  if (!isAbsolute(path)) {
    return resolve(cwdToUse, path)
  } else {
    return resolve(path)
  }
}

/**
 * Generate a temporary path for the instance of a given configuration file.
 * @function
 * @param {string} configFile - The path to the configuration file.
 * @returns {string} The temporary path associated with the configuration file.
 */
export async function toTempPath(configFile: string) {
  const resolvedPath = parse(toResolvedAbsolutePath(configFile))
  const tempPath = toResolvedAbsolutePath(`${resolvedPath.dir}/.pup/${resolvedPath.name}${resolvedPath.ext}-tmp`)
  await mkdir(tempPath, { recursive: true })
  return tempPath
}

/**
 * Generate a persistent storage path for the instance started by a given configuration file.
 * @function
 * @param {string} configFile - The path to the configuration file.
 * @returns {string} The persistent storage path associated with the configuration file.
 */
export async function toPersistentPath(configFile: string) {
  const resolvedPath = parse(toResolvedAbsolutePath(configFile))
  const persistentStoragePath = resolve(`${resolvedPath.dir}/.pup/${resolvedPath.name}${resolvedPath.ext}-data`)
  await mkdir(persistentStoragePath, { recursive: true })
  return persistentStoragePath
}
