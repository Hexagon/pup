/**
 * Functions and interfaces related to core configuration of pup
 *
 * @file      lib/core/process.ts
 * @license   MIT
 */

import { z } from "../../deps.ts"

interface Configuration {
  logger?: GlobalLoggerConfiguration
  watcher?: GlobalWatcherConfiguration
  processes: ProcessConfiguration[]
  plugins?: PluginConfiguration[]
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
  worker?: string
  env?: Record<string, string>
  cwd?: string
  path?: string
  cluster?: ClusterConfiguration
  pidFile?: string
  watch?: string[]
  autostart?: boolean
  cron?: string
  terminate?: string
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
  plugins: z.optional(
    z.array(
      z.object({
        url: z.string(),
        options: z.optional(z.object({})),
      }),
    ),
  ),
  processes: z.array(
    z.object({
      id: z.string().min(1).max(64).regex(/^[a-z0-9@._\-]+$/i, "Process ID can only contain characters a-Z 0-9 . _ - or @"),
      cmd: z.optional(z.string()),
      worker: z.optional(z.string()),
      cwd: z.optional(z.string()),
      env: z.optional(z.object({})),
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
