/**
 * Library entrypoint of Pup
 *
 * - Should export all interaces needed to use pup inside another application
 *
 * @file        mod.ts
 * @license     MIT
 */

/** Exports Pup Core */
export { Pup } from "./lib/core/pup.ts"

/** Exports types for Configuration */
export type { Configuration, GlobalLoggerConfiguration, ProcessConfiguration } from "./lib/core/configuration.ts"

/** Exports types for Logger */
export type { AttachedLogger } from "./lib/core/logger.ts"

/** Export everything needed for Plugins */
export { PupApi } from "./lib/core/api.ts"
export type { PluginConfiguration } from "./lib/core/configuration.ts"

export { Process } from "./lib/core/process.ts"
export type { ProcessScheduledEvent, ProcessStateChangedEvent, ProcessWatchEvent } from "./lib/core/process.ts"

export type { LogEvent } from "./lib/core/logger.ts"
