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
export { parse } from "https://deno.land/std@0.190.0/flags/mod.ts"
export type { Args } from "https://deno.land/std@0.190.0/flags/mod.ts"
export * as path from "https://deno.land/std@0.190.0/path/mod.ts"
export * as uuid from "https://deno.land/std@0.190.0/uuid/mod.ts"

// logger
export { stripColor } from "https://deno.land/std@0.190.0/fmt/colors.ts"
// config
export * as jsonc from "https://deno.land/std@0.190.0/jsonc/mod.ts"
// watcher
export { deferred, delay } from "https://deno.land/std@0.190.0/async/mod.ts"
export { globToRegExp, relative } from "https://deno.land/std@0.190.0/path/mod.ts"
// load balancer
export { copy } from "https://deno.land/std@0.190.0/streams/mod.ts"
// core - process
export { StringReader } from "https://deno.land/std@0.190.0/io/string_reader.ts"
export { readLines } from "https://deno.land/std@0.190.0/io/mod.ts"
// service installer
export { existsSync } from "https://deno.land/std@0.190.0/fs/mod.ts"
// ipc
export { debounce } from "https://deno.land/std@0.190.0/async/mod.ts"
export { basename, dirname, join, resolve } from "https://deno.land/std@0.190.0/path/mod.ts"

/**
 * Third party dependencies
 *
 * - Prefer deno.land/x when available
 */
export { Cron } from "https://deno.land/x/croner@6.0.3/dist/croner.js"
export { z } from "https://deno.land/x/zod@v3.21.4/mod.ts"
export { installService, uninstallService } from "https://deno.land/x/service@1.0.0-beta.6/mod.ts"
export type { InstallServiceOptions, UninstallServiceOptions } from "https://deno.land/x/service@1.0.0-beta.6/mod.ts"
export { $ } from "https://deno.land/x/dax@0.32.0/mod.ts"
export { CommandChild } from "https://deno.land/x/dax@0.32.0/src/command.ts"
