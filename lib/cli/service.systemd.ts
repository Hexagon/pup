/**
 * Exports helper functions to install a pup instance as a systemd service
 *
 * @file      lib/cli/service.systemd.ts
 * @license   MIT
 */

import { existsSync } from "../../deps.ts"
import { InstallServiceOptions } from "./service.ts"

const serviceFileTemplate = `[Unit]
Description={{name}} (Pup Service)

[Service]
ExecStart=/bin/sh -c "{{pupCommand}}"
Restart=always
RestartSec=30
Environment={{path}}
WorkingDirectory={{workingDirectory}}
{{extraServiceContent}}

[Install]
WantedBy=multi-user.target
`

/**
 * Installs pup as a systemd service, checking for existing services with the same name
 * and enabling linger if running in user mode.
 *
 * @async
 * @function installServiceSystemd
 * @param {InstallServiceOptions} options - Options for the installService function.
 */
async function installServiceSystemd(options: InstallServiceOptions, onlyGenerate: boolean) {
  // Default options
  const { system = false, name = "pup", config, user = Deno.env.get("USER"), home = Deno.env.get("HOME"), cwd = Deno.cwd() } = options

  const serviceFileName = `${name}.service`

  // Different paths for user and system mode
  const servicePathUser = `${home}/.config/systemd/user/${serviceFileName}`
  const servicePathSystem = `/etc/systemd/system/${serviceFileName}`
  const servicePath = system ? servicePathSystem : servicePathUser

  // Do not allow to overwrite existing services, regardless of mode
  if (existsSync(servicePathUser)) {
    console.error(`Service '${name}' already exists in '${servicePathUser}'. Exiting.`)
    Deno.exit(1)
  }
  if (existsSync(servicePathSystem)) {
    console.error(`Service '${name}' already exists in '${servicePathSystem}'. Exiting.`)
    Deno.exit(1)
  }

  // Require linger to be enabled in user mode
  if (!system && !onlyGenerate) {
    if (!user) {
      throw new Error("Username not found in $USER, must be specified using the --username flag.")
    }
    const enableLingerCommand = new Deno.Command("loginctl", { args: ["enable-linger", user] })
    const enableLinger = enableLingerCommand.spawn()
    const status = await enableLinger.status
    if (!status.success) {
      throw new Error("Failed to enable linger for user mode.")
    }
  }

  const denoPath = Deno.execPath()
  const pupCommand = `pup ${config ? `--config ${config}` : ""}`
  const pupPath = `PATH=${denoPath}:${home}/.deno/bin`
  const workingDirectory = cwd ? cwd : (config ? new URL(".", config).pathname : Deno.cwd())

  let serviceFileContent = serviceFileTemplate.replace("{{name}}", name)
  serviceFileContent = serviceFileContent.replace("{{pupCommand}}", pupCommand)
  serviceFileContent = serviceFileContent.replace("{{path}}", pupPath)
  serviceFileContent = serviceFileContent.replace("{{workingDirectory}}", workingDirectory)

  // Add user to service file if running in systen mode
  if (system) {
    serviceFileContent = serviceFileContent.replace("{{extraServiceContent}}", `User=${user}`)
  } else {
    serviceFileContent = serviceFileContent.replace("{{extraServiceContent}}", "")
  }

  if (onlyGenerate) {
    console.log("\nThis is a dry-run, nothing will be written to disk or installed.")
    console.log("\nPath: ", servicePath)
    console.log("\nConfiguration:\n")
    console.log(serviceFileContent)
  } else {
    // ToDo: Remember to rollback on failure
    await Deno.writeTextFile(servicePath, serviceFileContent)

    // Additional steps to finish the installation
    await Deno.writeTextFile(servicePath, serviceFileContent)
    const daemonReloadCommand = new Deno.Command("systemctl", { args: [system ? "" : "--user", "daemon-reload"], stderr: "piped", stdout: "piped" })
    const daemonReload = daemonReloadCommand.spawn()
    const daemonStatus = await daemonReload.status
    if (!daemonStatus.success) {
      rollbackSystemd(serviceFileContent, system)
      throw new Error("Failed to reload daemon, rolled back any changes.")
    }

    const enableServiceCommand = new Deno.Command("systemctl", { args: [system ? "" : "--user", "enable", name], stderr: "piped", stdout: "piped" })
    const enableService = enableServiceCommand.spawn()
    const enableServiceStatus = await enableService.status
    if (!enableServiceStatus.success) {
      rollbackSystemd(serviceFileContent, system)
      throw new Error("Failed to enable service, rolled back any changes.")
    }

    const startServiceCommand = new Deno.Command("systemctl", { args: [system ? "" : "--user", "start", name], stderr: "piped", stdout: "piped" })
    const startService = startServiceCommand.spawn()
    const startServiceStatus = await startService.status
    if (!startServiceStatus.success) {
      rollbackSystemd(serviceFileContent, system)
      throw new Error("Failed to start service, rolled back any changes.")
    }

    console.log(`Service '${name}' installed at '${servicePath}' and enabled.`)
  }
}

/**
 * Rolls back any changes made during the systemd service installation process
 * by removing the service file.
 * @function rollbackSystemd
 * @param {string} servicePath - The path of the service file to be removed.
 * @param {boolean} system - Whether the service is installed in system mode.
 */
async function rollbackSystemd(servicePath: string, system: boolean) {
  try {
    await Deno.remove(servicePath)

    const daemonReloadCommand = new Deno.Command("systemctl", { args: [system ? "" : "--user", "daemon-reload"] })
    const daemonReload = daemonReloadCommand.spawn()
    const daemonStatus = await daemonReload.status
    if (!daemonStatus.success) {
      throw new Error("Failed to reload daemon.")
    }
    console.log(`Changes rolled back: Removed '${servicePath}'.`)
  } catch (error) {
    console.error(`Failed to rollback changes: Could not remove '${servicePath}'. Error:`, error.message)
  }
}

export { installServiceSystemd }
