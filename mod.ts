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
