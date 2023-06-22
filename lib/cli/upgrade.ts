/**
 * Exports a function which tries to upgrade/downgrade the version of Pup,
 * then exit deno with the appropriate exit code
 *
 * Belongs to Pup cli entrypoint
 *
 * @file      lib/cli/upgrade.ts
 * @license   MIT
 */

import { Application } from "../../application.meta.ts"
import { gt, lt, parseVersion } from "../../deps.ts"

const VERSION_INVENTORY_URL = "https://deno.land/x/pup/versions.json"
const LOCAL_VERSION_INVENTORY_FILE = "./versions.json"

type Versions = {
  canary_url: string
  stable: Version[]
  prerelease: Version[]
}

type Version = {
  version: string
  url: string
  deno: string | null
  deno_unstable: string
}

// Fetch and return application versions
async function getVersions(local = false): Promise<Versions> {
  let versions: Versions
  if (local) {
    const data = await Deno.readTextFile(LOCAL_VERSION_INVENTORY_FILE)
    versions = JSON.parse(data)
  } else {
    const response = await fetch(VERSION_INVENTORY_URL)
    versions = await response.json()
  }
  return versions
}

// Determine if the current Deno version meets the required version
function denoVersionCheck(requiredVersion: string | null): boolean {
  if (requiredVersion === null) return true
  const denoVersion = parseVersion(Deno.version.deno)
  const required = parseVersion(requiredVersion)
  if (denoVersion !== null && required !== null && !lt(denoVersion, required)) {
    return true
  } else {
    return false
  }
}

export async function upgrade(
  version: string | undefined,
  channelName: string | undefined,
  local = false,
  freshInstall = false,
): Promise<void> {
  const versions = await getVersions(local)

  // Determine the channel from the version if it's not specified
  if (version && !channelName) {
    const semver = parseVersion(version)
    channelName = semver && semver.prerelease.length > 0 ? "prerelease" : "stable"
  }

  // Default channel to stable
  if (!channelName) {
    channelName = "stable"
  }

  let channel: Version[] | string = (versions as Record<string, string | Version[]>)[channelName]

  // Support for canary channel
  if (channelName === "canary") {
    if (!versions.canary_url) {
      throw new Error("Canary channel does not exist or is empty.")
    }
    channel = versions.canary_url
  }

  if (!channel || (Array.isArray(channel) && channel.length === 0)) {
    throw new Error(`Channel '${channelName}' does not exist or is empty.`)
  }

  // Select version to install
  let requestedVersion: Version | undefined
  if (channelName !== "canary") {
    if (version) {
      requestedVersion = (channel as Version[]).find((v) => v.version === version)
      if (!requestedVersion) {
        throw new Error(`Version '${version}' does not exist in channel '${channelName}'.`)
      }
    } else {
      // Select latest version from the channel if no version is specified
      requestedVersion = (channel as Version[])[0]
    }
  }

  let isStableValid = true
  let isUnstableValid = true
  const canaryInstall = channelName === "canary"
  let unstableInstall = canaryInstall ? true : false

  if (!canaryInstall) {
    // Verify Deno version
    isStableValid = denoVersionCheck((requestedVersion as Version).deno)
    isUnstableValid = denoVersionCheck((requestedVersion as Version).deno_unstable)

    if (isStableValid !== true) {
      if (isUnstableValid === true) {
        console.warn(
          `\nWarning: Your current Deno version does not meet the stable requirement but it matches the unstable version. Proceeding with ${
            freshInstall ? "install" : "upgrade"
          } may require the --unstable flag.`,
        )

        const answer = confirm("Do you want to proceed?")

        if (!answer) {
          console.log(`\n${freshInstall ? "Installation" : "Upgrade"} cancelled by the user.\n`)
          Deno.exit(1)
        }

        unstableInstall = true
      } else {
        console.log(
          `\nError: Current Deno version does not meet the requirements of the requested version (${(requestedVersion as Version).version}).\n`,
        )
        Deno.exit(1)
      }
    }
  }

  // Determine version to install
  const upgradeOrDowngradingAction = freshInstall ? "Installing" : (canaryInstall ? "Upgrading" : gt(Application.version, (requestedVersion as Version).version) ? "Downgrading" : "Upgrading")

  // If upgrading to a version that requires --unstable, alert the user
  if (unstableInstall) {
    console.warn(
      `\nWarning: Installing using Deno flag --unstable due to version requirements.`,
    )
  }

  // Install
  const installCmd = [
    "install",
    "-qAfr",
    "-n",
    "pup",
    unstableInstall ? "--unstable" : "",
    canaryInstall ? versions.canary_url : (requestedVersion as Version).url,
  ].filter(Boolean)

  console.info(`\nRunning: deno ${installCmd.join(" ")}`)

  const childProcess = new Deno.Command(
    "deno",
    {
      args: installCmd,
    },
  )

  const process = childProcess.spawn()
  process.ref()

  const status = await process.status
  if (status.success) {
    console.log(`\nSuccess! Now using ${channelName !== "canary" ? (requestedVersion as Version).version : "canary"}.`)
    if (!freshInstall) {
      console.log(
        `\nFor any potential changes that might affect your setup in this new version, please review the changelog at ${Application.changelog}\n`,
      )
    }
    Deno.exit(0)
  } else {
    console.log(`\n${upgradeOrDowngradingAction} failed.\n`)
    Deno.exit(1)
  }
}
