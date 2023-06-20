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
import { gt } from "../../deps.ts"

async function getLatestVersion(): Promise<string> {
  const url = "https://deno.land/x/pup/pup.ts"
  const result = await fetch(url)
  let newVersion = "unknown"
  if (result.status !== 200) {
    throw new Error("Request to deno.land/x failed, check network connection.")
  } else {
    const match = result.url.match(/@(.*)\//)
    newVersion = (match && match.length > 1) ? match[1] : "unknown"
  }
  return newVersion
}

async function getUrl(version: string): Promise<string | undefined> {
  const url = `https://deno.land/x/pup@${version}/pup.ts`
  const result = await fetch(url)
  if (result.status !== 200) {
    throw new Error(`Failed to fetch the URL for version: ${version}. Check the version exists and network connection.`)
  }
  return result.url
}

export async function upgrade(version?: string): Promise<void> {
  const latestVersion = await getLatestVersion()
  const currentVersion = Application.version
  const requestedVersion = (!version || version === "latest") ? latestVersion : version

  const upgradeOrDowngrading = gt(currentVersion, requestedVersion) ? "Downgrade" : "Upgrade"

  if (!version) {
    const confirmed = confirm(`\nYou're about to ${upgradeOrDowngrading.toLowerCase()} to the latest version: ${latestVersion}.\n\nDo you want to proceed?`)
    if (!confirmed) {
      console.log(`${upgradeOrDowngrading} cancelled.`)
      Deno.exit(0)
    }
  }

  const requestedVersionUrl = await getUrl(requestedVersion)

  if (currentVersion === requestedVersion) {
    let message = "\nNothing to do, already at latest version.\n"
    if (gt(latestVersion, currentVersion)) {
      message = `\nNothing to do, already at requested version.\nNOTE: New version available: ${latestVersion}\n`
    }
    console.log(message)
    Deno.exit(0)
  }

  if (!requestedVersionUrl) {
    console.log(`\nError: Requested version (${requestedVersion}) does not exist.\n`)
    Deno.exit(1)
  }

  const upgradeOrDowngradingAction = gt(currentVersion, requestedVersion) ? "Downgrading" : "Upgrading"
  console.log(`\n${upgradeOrDowngradingAction} from ${currentVersion} to ${requestedVersion}`)

  console.info(`\nRunning: deno install -qAfr -n pup ${requestedVersionUrl}`)

  const childProcess = new Deno.Command(
    "deno",
    {
      args: ["install", "-qAfr", "-n", "pup", `${requestedVersionUrl}`],
    },
  )

  const process = childProcess.spawn()
  process.ref()

  const status = await process.status

  if (status.success) {
    console.log(`\nSuccess! Now using ${requestedVersion}.`)
    console.log(`\nFor any potential changes that might affect your setup in this new version, please review the changelog at ${Application.changelog}\n`)
    Deno.exit(0)
  } else {
    console.log(`\n${upgradeOrDowngradingAction} failed.\n`)
    Deno.exit(1)
  }
}
