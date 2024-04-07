/**
 * Tool that generates or appends to `versions.json` based on `application.meta.ts`
 *
 * @file      tools/release.ts
 * @license   MIT
 */
import { parse } from "@std/semver"
import { exists } from "@cross/fs"
import { Application } from "../application.meta.ts"

const VERSIONS_JSON_PATH = "./versions.json"

interface Version {
  version: string
  url: string
  deno: string | null
  deno_unstable: string
  default_permissions: string[]
}

interface Versions {
  canary_url: string
  stable: Version[]
  prerelease: Version[]
}

async function main() {
  let versions: Versions = { canary_url: "", stable: [], prerelease: [] }

  if (await exists(VERSIONS_JSON_PATH)) {
    const data = await Deno.readTextFile(VERSIONS_JSON_PATH)
    versions = JSON.parse(data)
  }

  versions.canary_url = Application.canary_url

  const newVersion: Version = {
    version: Application.version,
    url: Application.url.replace("$VERSION", Application.version),
    deno: Application.deno,
    deno_unstable: Application.deno_unstable,
    default_permissions: Application.permissions,
  }

  // Parse the version using semver
  const semver = parse(Application.version)

  // If semver.prerelease is not empty, it's a prerelease version
  if (semver?.prerelease && semver.prerelease.length > 0) {
    versions.prerelease = versions.prerelease.filter((ver) => ver.version !== Application.version)
    versions.prerelease.unshift(newVersion)
  } else {
    versions.stable = versions.stable.filter((ver) => ver.version !== Application.version)
    versions.stable.unshift(newVersion)
  }

  const versionsJson = JSON.stringify(versions, null, 2)
  await Deno.writeTextFile(VERSIONS_JSON_PATH, versionsJson)
}

main()
