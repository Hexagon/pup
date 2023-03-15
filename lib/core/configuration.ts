import { z } from "../../deps.ts"

interface Configuration {
  logger?: GlobalLoggerConfiguration
  watcher?: GlobalWatcherConfiguration
  processes: ProcessConfiguration[]
  /* plugins?: PluginEntry[] */
}

/*interface PluginEntry {
  url: string
  options?: unknown
}*/

interface _BaseLoggerConfiguration {
  console?: boolean
  stdout?: string
  stderr?: string
}

interface GlobalLoggerConfiguration extends _BaseLoggerConfiguration {
  colors?: boolean
  decorateFiles?: boolean
  decorate?: boolean
}

interface ProcessLoggerConfiguration extends _BaseLoggerConfiguration {
  colors?: boolean
  decorateFiles?: boolean
}

interface GlobalWatcherConfiguration {
  interval?: number
  exts?: string[]
  match?: string[]
  skip?: string[]
}

interface ProcessConfiguration {
  id: string
  cmd: string[]
  env?: Record<string, string>
  cwd?: string
  pidFile?: string
  watch?: string[]
  autostart?: boolean
  cron?: string
  timeout?: number
  overrun?: boolean
  logger?: ProcessLoggerConfiguration
  restart?: string
  restartDelayMs?: number
  restartLimit?: number
}

const ConfigurationSchema = z.object({
  logger: z.optional(
    z.object({
      console: z.optional(z.boolean()),
      stdout: z.optional(z.string()),
      stderr: z.optional(z.string()),
      colors: z.optional(z.boolean()),
      decorateFiles: z.optional(z.boolean()),
      decorate: z.optional(z.boolean()),
    }).strict(),
  ),
  watcher: z.optional(
    z.object({
      interval: z.optional(z.number()),
      exts: z.optional(z.array(z.string()).default(["ts", "tsx", "js", "jsx", "json"])),
      match: z.optional(z.array(z.string()).default(["**/*.*"])),
      skip: z.optional(z.array(z.string()).default(["**/.git/**"])),
    }).strict(),
  ),
  /*plugins: z.optional(
    z.object({
      url: z.string(),
      options: z.optional(z.object({}))
    }).strict()
  ),*/
  processes: z.array(
    z.object({
      id: z.string().min(1).max(64).regex(/^[a-z0-9@._\-]+$/i, "Process ID can only contain characters a-Z 0-9 . _ - or @"),
      cmd: z.array(z.string()),
      cwd: z.optional(z.string()),
      env: z.optional(z.object({})),
      pidFile: z.optional(z.string()),
      autostart: z.optional(z.boolean()),
      watch: z.optional(z.array(z.string())),
      cron: z.optional(z.string().min(9).max(256)),
      restart: z.optional(z.enum(["always", "error"])),
      restartDelayMs: z.number().min(0).max(24 * 60 * 60 * 1000 * 1).default(10000), // Max one day
      overrun: z.optional(z.boolean()),
      restartLimit: z.optional(z.number().min(0)),
      timeout: z.optional(z.number().min(1)),
      logger: z.optional(
        z.object({
          console: z.optional(z.boolean()),
          stdout: z.optional(z.string()),
          stderr: z.optional(z.string()),
          decorateFiles: z.optional(z.boolean()),
          decorate: z.optional(z.boolean()),
        }).strict(),
      ),
    }).strict(),
  ),
}).strict()

function validateConfiguration(unsafeConfiguration: unknown): Configuration {
  try {
    ConfigurationSchema.parse(unsafeConfiguration)
  } catch (e) {
    throw new Error(e.errors[0]?.message)
  }
  return unsafeConfiguration as Configuration
}

/**
 * Configuration file generator
 */

function generateConfiguration(id: string, cmd: string, cwd?: string, cron?: string, autostart?: boolean, watch?: string) {
  const configuration: Configuration = {
    processes: [],
  }

  // Split command to array
  const commandArray = cmd.split(" ")

  const processConfiguration: ProcessConfiguration = {
    id,
    cmd: commandArray,
  }

  if (cwd) processConfiguration.cwd = cwd
  if (cron) processConfiguration.cron = cron
  if (autostart) processConfiguration.autostart = autostart
  if (watch) processConfiguration.watch = [watch]

  configuration.processes.push(processConfiguration)

  // Validate configuration before returning
  validateConfiguration(configuration)

  return configuration
}

export { ConfigurationSchema, generateConfiguration, validateConfiguration }

export type { Configuration, GlobalLoggerConfiguration, ProcessConfiguration, ProcessLoggerConfiguration }
