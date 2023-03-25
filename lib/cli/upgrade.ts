import { Application } from "../../application.meta.ts"

async function getLatestVersion(): Promise<string> {
  /**
   * When requesting this URL, we'll get redirected to the latest version automatically,
   * use the redirected result to get the latest version
   */
  const url = "https://deno.land/x/pup/pup.ts"
  const result = await fetch(url)
  let newVersion = "unknown"
  if (result.status !== 200) {
    throw new Error("Request to deno.land/x failed, check network connection.")
  } else {
    const match = result.url.match(/@(.*)\//)
    newVersion = (match && match.length > 1) ? match[1] : "unkown"
    if (match && match.length > 1) {
      newVersion = match[1]
    }
  }
  return newVersion
}

async function getUrl(version: string): Promise<string | undefined> {
  const url = `https://deno.land/x/pup@${version}/pup.ts`
  const result = await fetch(url)
  return result.status === 200 ? result.url : undefined
}

export async function upgrade(version?: string): Promise<void> {
  // Select url
  const latestVersion = await getLatestVersion()
  const currentVersion = Application.version
  const requestedVersion = (!version || version === "latest") ? latestVersion : version
  const requestedVersionUrl = await getUrl(requestedVersion)

  // Already at requested version
  if (currentVersion === requestedVersion) {
    if (currentVersion === latestVersion) {
      console.log("\nNothing to do, already at latest version.\n")
    } else {
      console.log("\nNothing to do, already at requested version.\n")
    }
    if (currentVersion !== latestVersion && currentVersion < latestVersion) {
      console.log(`NOTE: New version available: ${latestVersion}\n`)
    }
    Deno.exit(0)
  }

  // Requested version does not exist
  if (!requestedVersionUrl) {
    console.log(`\nUpgrade failed: Requested version (${requestedVersion}) does not exist.\n`)
    Deno.exit(1)
  }

  // Print status
  const upgradeOrDowngrading = currentVersion > requestedVersion ? "Downgrading" : "Upgrading"
  console.log(`\n${upgradeOrDowngrading} from ${currentVersion} to ${requestedVersion}`)

  console.info(`\nRunning: deno install -qAfr ${requestedVersionUrl}`)

  const childProcess = new Deno.Command(
    "deno",
    {
      args: ["install", "-qAfr", `${requestedVersionUrl}`],
    },
  )

  const result = childProcess.spawn()

  const status = await result.status

  if (status.success) {
    console.log(`\nSuccess! Now using ${requestedVersion}.\n`)
  } else {
    console.log(`\n${upgradeOrDowngrading} failed.\n`)
  }

  Deno.exit(0)
}
