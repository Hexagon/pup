/**
 * Exports helper functions to install a pup instance as a systemd service on Linux or a launchd service on macOS.
 * Throws an error on Windows.
 *
 * @file      lib/cli/service.ts
 * @license   MIT
 */

/**
 * Options for the installService function.
 *
 * @interface InstallServiceOptions
 * @property {boolean} [system] - Indicates whether to use system mode (default is to use user mode).
 * @property {string} [name='pup'] - Name of the service (default: 'pup').
 * @property {string} [config] - Path to the configuration file (default: undefined).
 * @property {string} [user] - The username to run the service as (default: current user).
 * @property {string} [home] - The user's home directory path (default: current user's home).
 * @property {string} [cwd] - The working directory for the service (default: current working directory).
 */
interface InstallServiceOptions {
  system?: boolean
  name?: string
  config?: string
  user?: string
  home?: string
  cwd?: string
}

/**
 * Installs pup as a systemd service on Linux or a launchd service on macOS, checking for existing services with the same name
 * and enabling linger if running in user mode on Linux.
 *
 * @async
 * @function installService
 * @param {InstallServiceOptions} options - Options for the installService function.
 */
async function installService(options: InstallServiceOptions, onlyGenerate: boolean) {
  if (Deno.build.os === "linux") {
    const initSystem = await detectInitSystem()
    if (initSystem === "systemd") {
      const { installServiceSystemd } = await import("./service.systemd.ts")
      await installServiceSystemd(options, onlyGenerate)
    } else if (initSystem === "sysvinit" || initSystem === "docker-init") {
      const { installServiceInit } = await import("./service.init.ts")
      await installServiceInit(options, onlyGenerate)
    } else if (initSystem === "upstart") {
      const { installServiceUpstart } = await import("./service.upstart.ts")
      await installServiceUpstart(options, onlyGenerate)
    } else {
      throw new Error("Unsupported init system. Service installation is only supported with systemd on Linux.")
    }
  } else if (Deno.build.os === "darwin") {
    const { installServiceLaunchd } = await import("./service.launchd.ts")
    await installServiceLaunchd(options, onlyGenerate)
  } else {
    throw new Error("Unsupported operating system. Service installation is only supported on Linux and macOS.")
  }
}

async function detectInitSystem(): Promise<string> {
  const process = await new Deno.Command("ps", {
    args: ["-p", "1", "-o", "comm="],
    stdout: "piped",
    stderr: "piped",
  })
  process.spawn()
  const output = await process.output()
  const outputText = new TextDecoder().decode(output.stdout)

  if (outputText.includes("systemd")) {
    return "systemd"
  } else if (outputText.includes("init")) {
    // Check for Upstart
    if (Deno.statSync("/sbin/initctl").isFile) {
      return "upstart"
    }
    return "sysvinit"
  } else if (outputText.includes("openrc")) {
    return "openrc"
  } else if (outputText.includes("docker-init")) {
    return "dockerinit"
  } else {
    throw new Error("Unsupported init system.")
  }
}

export { installService }
export type { InstallServiceOptions }
