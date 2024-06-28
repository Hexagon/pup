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
import { greaterThan, parse } from "@std/semver"
import { exit } from "@cross/utils"
import { readFile } from "@cross/fs"
import { CurrentRuntime, Runtime } from "@cross/runtime"

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

  const canaryInstall = channelName === "canary"

  // Determine version to install
  const upgradeOrDowngradingAction = freshInstall
    ? "Installing"
    : (canaryInstall ? "Upgrading" : greaterThan(parse(Application.version), parse((requestedVersion as Version).version)) ? "Downgrading" : "Upgrading")

  // Deno only: Pass along --unsafely-ignore-certificate-errors when installing
  let ignoreCertificateErrorsString = ""
  if (CurrentRuntime === Runtime.Deno) {
    if (ignoreCertficateErrors !== undefined) {
      ignoreCertificateErrorsString = "--unsafely-ignore-certificate-errors"
      if (ignoreCertficateErrors !== "") {
        ignoreCertificateErrorsString += "=" + ignoreCertficateErrors
      }
    }
  }

  // Install
  const installCmd = []
  let installRuntime = undefined
  if (CurrentRuntime === Runtime.Deno) {
    installRuntime = "deno"
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
    installCmd.push("-n", "pup") // Installed command name = pup
    installCmd.push(canaryInstall ? versions.canary_url : (requestedVersion as Version).jsr_url)
  } else if (CurrentRuntime === Runtime.Bun) {
    installRuntime = "bun"
    installCmd.push("install")
    installCmd.push("-g")
    installCmd.push(canaryInstall ? versions.canary_url : (requestedVersion as Version).npm_url)
  } else {
    console.error("Current time not supported, only Deno and Bun is supported at the moment.")
  }

  console.info(`\nRunning: deno ${installCmd.join(" ")}`)

  const childProcess = new Deno.Command(
    installRuntime,
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
    console.log(`\n${upgradeOrDowngradingAction} failed.\n`)
    exit(1)
  }
}
