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
import { greaterThan, lessThan, parse } from "@std/semver"
import { exit } from "@cross/utils"
import { mktempdir, readFile } from "@cross/fs"
import { join } from "@std/path/join"

// The deno.land/x-url has to be used until first stable release, or until jsr.io fixes issue
// https://github.com/jsr-io/jsr/issues/382
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
  default_permissions: string[]
}

// Fetch and return application versions
async function getVersions(local = false): Promise<Versions> {
  let versions: Versions
  if (local) {
    const data = await readFile(LOCAL_VERSION_INVENTORY_FILE)
    const dataText = new TextDecoder().decode(data)
    versions = JSON.parse(dataText)
  } else {
    const response = await fetch(VERSION_INVENTORY_URL)
    versions = await response.json()
  }
  return versions
}

// Determine if the current Deno version meets the required version
function denoVersionCheck(requiredVersion: string | null): boolean {
  if (requiredVersion === null) return false
  const denoVersion = parse(Deno.version.deno)
  const required = parse(requiredVersion)
  if (denoVersion !== null && required !== null && !lessThan(denoVersion, required)) {
    return true
  } else {
    return false
  }
}

export async function upgrade(
  version: string | undefined,
  channelName: string | undefined,
  ignoreCertficateErrors: string | undefined,
  allPermissions = false,
  local = false,
  freshInstall = false,
): Promise<void> {
  const versions = await getVersions(local)

  // Determine the channel from the version if it's not specified
  if (version && !channelName) {
    const semver = parse(version)
    channelName = semver && semver.prerelease && semver.prerelease.length > 0 ? "prerelease" : "stable"
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
          } will require Deno to run with unstable features enabled.\n`,
        )

        const answer = confirm("Do you want to proceed?")

        if (!answer) {
          console.log(`\n${freshInstall ? "Installation" : "Upgrade"} cancelled by the user.\n`)
          exit(1)
        }

        unstableInstall = true
      } else {
        console.log(
          `\nError: Current Deno version does not meet the requirements of the requested version (${(requestedVersion as Version).version}).\n`,
        )
        exit(1)
      }
    }
  }

  // Determine version to install
  const upgradeOrDowngradingAction = freshInstall
    ? "Installing"
    : (canaryInstall ? "Upgrading" : greaterThan(parse(Application.version), parse((requestedVersion as Version).version)) ? "Downgrading" : "Upgrading")

  // If upgrading to a version that requires --unstable, alert the user
  if (unstableInstall) {
    console.warn(
      `\nWarning: Installing using Deno unstable features enabled due to version requirements.`,
    )
  }

  // Pass along --unsafely-ignore-certificate-errors when installing
  let ignoreCertificateErrorsString = ""
  if (ignoreCertficateErrors !== undefined) {
    ignoreCertificateErrorsString = "--unsafely-ignore-certificate-errors"
    if (ignoreCertficateErrors !== "") {
      ignoreCertificateErrorsString += "=" + ignoreCertficateErrors
    }
  }

  let temporaryDenoJsonFilePath = ""
  if (canaryInstall) {
    const canaryDenoJsonUrl = versions.canary_url.replace("pup.ts", "deno.json")

    // Create a temporary directory
    const canaryDenoJsonLocation = await mktempdir("pup")

    // Download the canary deno.json file to the temporary directory
    const response = await fetch(canaryDenoJsonUrl)
    const data = await response.text()
    temporaryDenoJsonFilePath = await join(canaryDenoJsonLocation, "deno.json")

    // Write the file to the temporary location
    await Deno.writeTextFile(temporaryDenoJsonFilePath, data)

    console.log(`Downloaded canary deno.json to ${temporaryDenoJsonFilePath}`)
  }

  // Install
  const installCmd = []

  installCmd.push("install")
  installCmd.push("-qfrg") // Quite, Reload, Force reinstall, Global
  if (allPermissions || !requestedVersion?.default_permissions) {
    installCmd.push("-A") // All permissions
  } else {
    installCmd.push(...requestedVersion!.default_permissions)
  }
  if (ignoreCertificateErrorsString && ignoreCertificateErrorsString !== "") {
    installCmd.push(ignoreCertificateErrorsString)
  }
  if (canaryInstall) {
    installCmd.push("-c", temporaryDenoJsonFilePath)
    installCmd.push("--no-lock")
  }
  installCmd.push("-n", "pup") // Installed command name = pup
  installCmd.push(canaryInstall ? versions.canary_url : (requestedVersion as Version).url)

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
    console.log(`\nSuccess! Now using ${channelName !== "canary" ? (requestedVersion as Version).version : "canary"}.\n`)
    if (!freshInstall) {
      console.log(
        `\nFor any potential changes that might affect your setup in this new version, please review the changelog at ${Application.changelog}\n`,
      )
    }
    exit(0)
  } else {
    console.log(`\nAutomatic ${upgradeOrDowngradingAction} failed! Try running the installation command manually: \n\ndeno ${installCmd.join(" ")}\n`)
    exit(1)
  }
}
