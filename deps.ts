/**
 * Re-exports the required methods and types from remote modules
 *
 * - Check for updates using `deno task update-deps`
 * - Always pin all imports to a specific version
 *
 *  @file deps.ts
 */

/**
 * Deno std dependencies
 *
 * - Always use the same version of all imports from deno.land/std
 */
// cli
export { readLines } from "https://deno.land/std@0.178.0/io/mod.ts"
export { parse } from "https://deno.land/std@0.178.0/flags/mod.ts"
export type { Args } from "https://deno.land/std@0.178.0/flags/mod.ts"
// config
export * as jsonc from "https://deno.land/std@0.178.0/encoding/jsonc.ts"
// watcher
export { deferred, delay } from "https://deno.land/std@0.178.0/async/mod.ts"
export { globToRegExp, relative } from "https://deno.land/std@0.178.0/path/mod.ts"

/**
 * Third party dependencies
 *
 * - Prefer deno.land/x when available
 */
export { Cron } from "https://deno.land/x/croner@6.0.2/dist/croner.js"
export { z } from "https://deno.land/x/zod@v3.21.4/mod.ts"
