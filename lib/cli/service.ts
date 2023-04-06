/**
 * Exports helper functions to install a pup instance as a systemd service
 *
 * @file      lib/cli/service.ts
 * @license   MIT
 */

import { existsSync } from "../../deps.ts"

/**
 * Options for the installService function.
 *
 * @interface InstallServiceOptions
 * @property {boolean} [user=true] - Indicates whether to use user mode (default: true).
 * @property {string} [name='pup'] - Name of the systemd service (default: 'pup').
 * @property {string} [config] - Path to the configuration file (default: undefined).
 */
interface InstallServiceOptions {
  user?: boolean
  name?: string
  config?: string
}

const serviceFileTemplate = `[Unit]
Description={{name}} service

[Service]
ExecStart={{pupCommand}}
Restart=always
Environment={{path}}
{{extraServiceContent}}

[Install]
WantedBy=multi-user.target
`

/**
 * Installs pup as a systemd service, checking for existing services with the same name
 * and enabling linger if running in user mode.
 *
 * @async
 * @function installService
 * @param {InstallServiceOptions} options - Options for the installService function.
 */
async function installService(options: InstallServiceOptions) {
  // Default options
  const { user = true, name = "pup", config } = options

  const serviceFileName = `${name}.service`

  // Different paths for user and system mode
  const servicePathUser = `${Deno.env.get("HOME")}/.config/systemd/user/${serviceFileName}`
  const servicePathSystem = `/etc/systemd/system/${serviceFileName}`
  const servicePath = user ? servicePathUser : servicePathSystem

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
  if (user) {
    const { success } = await run({ cmd: ["loginctl", "enable-linger"] })
    if (!success) {
      console.error("Failed to enable linger for user mode.")
      Deno.exit(1)
    }
  }

  const denoPath = Deno.execPath()
  const pupCommand = `${denoPath} run -A ${Deno.mainModule} ${config ? `--config ${config}` : ""}`
  const pupPath = `PATH=$PATH:${denoPath}:$HOME/.deno/bin`

  let serviceFileContent = serviceFileTemplate.replace("{{name}}", name)
  serviceFileContent = serviceFileContent.replace("{{pupCommand}}", pupCommand)
  serviceFileContent = serviceFileContent.replace("{{path}}", pupPath)

  // Add user to service file if running in systen mode
  if (!user) {
    serviceFileContent = serviceFileContent.replace("{{extraServiceContent}}", user ? `User=${Deno.env.get("USER")}` : "")
  }

  await Deno.writeTextFile(servicePath, serviceFileContent)

  console.log(`Service '${name}' installed at '${servicePath}'.`)
}

export { installService }
