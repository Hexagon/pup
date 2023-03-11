import { z } from "../../deps.ts"

interface Configuration {
  logger?: GlobalLoggerConfiguration
  processes: ProcessConfiguration[]
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

interface ProcessConfiguration {
  id: string
  cmd: string[]
  env?: Record<string, string>
  cwd?: string
  autostart?: boolean
  cron?: string
  maxRestarts?: number
  restart?: string
  restartDelayMs?: number
  logger?: ProcessLoggerConfiguration
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
  processes: z.array(
    z.object({
      id: z.string().min(1).max(64).regex(/^[a-z0-9@._\-]+$/i, "Process ID can only contain characters a-Z 0-9 . _ - or @"),
      cmd: z.array(z.string()),
      cwd: z.optional(z.string()),
      env: z.optional(z.object({})),
      autostart: z.optional(z.boolean()),
      cron: z.optional(z.string().min(9).max(256)),
      restart: z.optional(z.enum(["always", "error"])),
      restartDelayMs: z.optional(z.number().min(0).max(24*60*60*1000*1)), // Max one day
      maxRestarts: z.optional(z.number().min(0)),
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
  const validationResult = ConfigurationSchema.safeParse(unsafeConfiguration)

  if (!validationResult.success) {
    throw new Error(validationResult.error.errors[0]?.message)
  }

  // It is now safe to "cast" to a real configuraton object
  return unsafeConfiguration as Configuration
}

export { validateConfiguration }

export type { Configuration, GlobalLoggerConfiguration, ProcessConfiguration, ProcessLoggerConfiguration }
