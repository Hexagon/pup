import { existsSync } from "../../deps.ts"
import { InstallServiceOptions } from "./service.ts"

const plistTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>{{name}}</string>
  <key>ProgramArguments</key>
  <array>
    <string>{{denoPath}}</string>
    <string>run</string>
    <string>--allow-all</string>
    {{pupCommand}}
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>{{path}}</string>
  </dict>
  <key>WorkingDirectory</key>
  <string>{{workingDirectory}}</string>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
`

async function installServiceLaunchd(options: InstallServiceOptions, onlyGenerate: boolean) {
  // Default options
  // deno-lint-ignore no-unused-vars
  const { system = false, name = "pup", config, user = Deno.env.get("USER"), home = Deno.env.get("HOME"), cwd = Deno.cwd() } = options

  const plistFileName = `${name}.plist`

  // Different paths for user and system mode
  const plistPathUser = `${home}/Library/LaunchAgents/${plistFileName}`
  const plistPathSystem = `/Library/LaunchDaemons/${plistFileName}`
  const plistPath = system ? plistPathSystem : plistPathUser

  // Do not allow to overwrite existing services, regardless of mode
  if (existsSync(plistPathUser) || existsSync(plistPathSystem)) {
    console.error(`Service '${name}' already exists. Exiting.`)
    Deno.exit(1)
  }

  const denoPath = Deno.execPath()
  const pupCommand = `pup ${config ? `--config ${config}` : ""}`
  const pupPath = `PATH=$PATH:${denoPath}:${home}/.deno/bin`
  const workingDirectory = cwd ? cwd : (config ? new URL(".", config).pathname : Deno.cwd())

  let plistContent = plistTemplate.replace("{{name}}", name)
  plistContent = plistContent.replace("{{denoPath}}", denoPath)
  plistContent = plistContent.replace("{{pupCommand}}", `<string>${pupCommand}</string>`)
  plistContent = plistContent.replace("{{path}}", pupPath)
  plistContent = plistContent.replace("{{workingDirectory}}", workingDirectory)

  if (onlyGenerate) {
    console.log("\nThis is a dry-run, nothing will be written to disk or installed.")
    console.log("\nPath: ", plistPath)
    console.log("\nConfiguration:\n")
    console.log(plistContent)
  } else {
    // ToDo: Remember to rollback on failure
    await Deno.writeTextFile(plistPath, plistContent)

    console.log(`Service '${name}' installed at '${plistPath}'.`)

    // ToDo: Actually run the service and verify that it works, if not - use the rollback function
    if (system) {
      console.log("Please run the following command as root to load the service:")
      console.log(`sudo launchctl load
      ${plistPath}`)
    } else {
      console.log("Please run the following command to load the service:")
      console.log(`launchctl load ${plistPath}`)
    }
  }
}

/**

Rolls back any changes made during the launchd service installation process
by removing the plist file.
@function rollbackLaunchd
@param {string} plistPath - The path of the plist file to be removed.
@param {boolean} system - Whether the service is installed in system mode.
*/
// deno-lint-ignore no-unused-vars
async function rollbackLaunchd(plistPath: string, system: boolean) {
  try {
    await Deno.remove(plistPath)
    console.log(`Changes rolled back: Removed '${plistPath}'.`)
  } catch (error) {
    console.error(`Failed to rollback changes: Could not remove '${plistPath}'. Error:`, error.message)
  }
}

export { installServiceLaunchd }
