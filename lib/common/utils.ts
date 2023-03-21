import { path } from "../../deps.ts"

export async function fileExists(filePath: string) {
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

export function toTempPath(configFile: string) {
  const resolvedPath = path.parse(path.resolve(configFile))
  const tempPath = path.resolve(`${resolvedPath.dir}/.${resolvedPath.name}${resolvedPath.ext}-tmp`)
  Deno.mkdir(tempPath, { recursive: true })
  return tempPath
}

export function toPersistentPath(configFile: string) {
  const resolvedPath = path.parse(path.resolve(configFile))
  const persistentStoragePath = path.resolve(`${resolvedPath.dir}/.${resolvedPath.name}${resolvedPath.ext}-data`)
  Deno.mkdir(persistentStoragePath, { recursive: true })
  return persistentStoragePath
}
