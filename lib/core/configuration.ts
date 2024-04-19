/**
 * Functions and interfaces related to core configuration of pup
 *
 * @file      lib/core/configuration.ts
 * @license   MIT
 */

import { z } from "zod"

export const DEFAULT_INTERNAL_LOG_HOURS = 48
export const MAINTENANCE_INTERVAL_MS = 900_000
export const WATCHDOG_INTERVAL_MS = 1_000
export const APPLICATION_STATE_WRITE_LIMIT_MS = 20_000
export const LOAD_BALANCER_DEFAULT_VALIDATION_INTERVAL_S = 60
export const KV_SIZE_LIMIT_BYTES = 65_536

interface Configuration {
  name?: string
  api?: ApiConfiguration
  logger?: GlobalLoggerConfiguration
  watcher?: GlobalWatcherConfiguration
  processes: ProcessConfiguration[]
  plugins?: PluginConfiguration[]
  terminateTimeout?: number
  terminateGracePeriod?: number
}

interface ApiConfiguration {
  hostname?: string
  port?: number
}

interface PluginConfiguration {
  url: string
  options?: unknown
}

interface _BaseLoggerConfiguration {
  console?: boolean
  stdout?: string
  stderr?: string
}

interface GlobalLoggerConfiguration extends _BaseLoggerConfiguration {
  colors?: boolean
  decorateFiles?: boolean
  decorate?: boolean
  internalLogHours?: number
}

interface ProcessLoggerConfiguration extends _BaseLoggerConfiguration {
  colors?: boolean
  decorateFiles?: boolean
}

interface ClusterConfiguration {
  instances: number
  commonPort?: number
  startPort?: number
  strategy?: string
}

interface GlobalWatcherConfiguration {
  interval?: number
  exts?: string[]
  match?: string[]
  skip?: string[]
}

interface ProcessConfiguration {
  id: string
  cmd?: string
  worker?: string[]
  env?: Record<string, string>
  cwd?: string
  path?: string
  cluster?: ClusterConfiguration
  pidFile?: string
  watch?: string[]
  autostart?: boolean
  cron?: string
  terminate?: string
  terminateTimeout?: number
  terminateGracePeriod?: number
  timeout?: number
  overrun?: boolean
  logger?: ProcessLoggerConfiguration
  restart?: string
  restartDelayMs?: number
  restartLimit?: number
}

const ConfigurationSchema = z.object({
  $schema: z.optional(z.string()),
  terminateTimeout: z.number().min(0).default(30),
  terminateGracePeriod: z.number().min(0).default(0),
  logger: z.optional(
    z.object({
      console: z.optional(z.boolean()),
      stdout: z.optional(z.string()),
      stderr: z.optional(z.string()),
      colors: z.optional(z.boolean()),
      decorateFiles: z.optional(z.boolean()),
      decorate: z.optional(z.boolean()),
      internalLogHours: z.number().min(0).max(366).default(DEFAULT_INTERNAL_LOG_HOURS),
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
  plugins: z.optional(
    z.array(
      z.object({
        url: z.string(),
        options: z.optional(z.any()),
      }),
    ),
  ),
  name: z.optional(z.string().min(1).max(64).regex(/^[a-z0-9@._\-]+$/i, "Instance name can only contain characters a-Z 0-9 . _ or -")),
  processes: z.array(
    z.object({
      id: z.string().min(1).max(64).regex(/^[a-z0-9@._\-]+$/i, "Process ID can only contain characters a-Z 0-9 . _ - or @"),
      cmd: z.optional(z.string()),
      worker: z.optional(z.array(z.string())),
      cwd: z.optional(z.string()),
      env: z.optional(z.record(z.string())),
      cluster: z.optional(z.object({
        instances: z.number().min(0).max(65535).default(1),
        commonPort: z.number().min(1).max(65535).optional(),
        startPort: z.number().min(1).max(65535).optional(),
        strategy: z.enum(["ip-hash", "round-robin", "least-connections"]).default("round-robin"),
      })),
      pidFile: z.optional(z.string()),
      path: z.optional(z.string()),
      autostart: z.optional(z.boolean()),
      watch: z.optional(z.array(z.string())),
      cron: z.optional(z.string().min(9).max(256)),
      terminate: z.optional(z.string().min(9).max(256)),
      terminateTimeout: z.number().min(0).default(30),
      terminateGracePeriod: z.number().min(0).default(0),
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

function generateConfiguration(
  id: string,
  cmd: string,
  cwd?: string,
  cron?: string,
  terminate?: string,
  autostart?: boolean,
  watch?: string,
  name?: string,
  instances?: string,
  startPort?: string,
  commonPort?: string,
  strategy?: string,
  stdout?: string,
  stderr?: string,
) {
  const configuration: Configuration = {
    processes: [],
  }

  if (name) {
    configuration.name = name
  }

  // Split command to array

  const processConfiguration: ProcessConfiguration = {
    id,
    cmd,
  }

  if (cwd) processConfiguration.cwd = cwd
  if (cron) processConfiguration.cron = cron
  if (terminate) processConfiguration.terminate = terminate
  if (autostart) processConfiguration.autostart = autostart
  if (watch) processConfiguration.watch = [watch]
  if (instances || startPort || commonPort || strategy) {
    processConfiguration.cluster = {
      instances: instances ? parseInt(instances) : 1,
      startPort: startPort ? parseInt(startPort) : undefined,
      commonPort: commonPort ? parseInt(commonPort) : undefined,
      strategy: strategy,
    }
  }
  if (stderr || stdout) {
    processConfiguration.logger = {
      stderr,
      stdout,
    }
  }
  configuration.processes.push(processConfiguration)

  // Validate configuration before returning
  validateConfiguration(configuration)

  return configuration
}

export { ConfigurationSchema, generateConfiguration, validateConfiguration }

export type { Configuration, GlobalLoggerConfiguration, PluginConfiguration, ProcessConfiguration, ProcessLoggerConfiguration }
