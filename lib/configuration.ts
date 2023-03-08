import { z } from "../deps.ts"

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
  name: string
  cmd: string[]
  cwd?: string
  autostart?: boolean
  startPattern?: string
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
      name: z.string(),
      cmd: z.array(z.string()),
      cwd: z.optional(z.string()),
      autostart: z.optional(z.boolean()),
      startPattern: z.optional(z.string()),
      restart: z.optional(z.string()),
      restartDelayMs: z.optional(z.number()),
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

function validateConfiguration(configuration: Configuration) {
  const validationResult = ConfigurationSchema.safeParse(configuration)

  if (!validationResult.success) {
    throw new Error(validationResult.error.errors[0]?.message)
  }

  return configuration
}

export { validateConfiguration }

export type { Configuration, GlobalLoggerConfiguration, ProcessConfiguration, ProcessLoggerConfiguration }
