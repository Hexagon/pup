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
export { parse } from "https://deno.land/std@0.207.0/flags/mod.ts"
export type { Args } from "https://deno.land/std@0.207.0/flags/mod.ts"
export * as path from "https://deno.land/std@0.207.0/path/mod.ts"
export * as uuid from "https://deno.land/std@0.207.0/uuid/mod.ts"
// logger
export { stripColor } from "https://deno.land/std@0.207.0/fmt/colors.ts"
// config
export * as jsonc from "https://deno.land/std@0.207.0/jsonc/mod.ts"
// watcher
export { deferred, delay } from "https://deno.land/std@0.207.0/async/mod.ts"
export { globToRegExp, relative } from "https://deno.land/std@0.207.0/path/mod.ts"
// load balancer
export { copy } from "https://deno.land/std@0.207.0/streams/mod.ts"
// core - process
export { StringReader } from "https://deno.land/std@0.207.0/io/string_reader.ts"
export { readLines } from "https://deno.land/std@0.207.0/io/mod.ts"
// service installer, release tool
export { existsSync } from "https://deno.land/std@0.207.0/fs/mod.ts"
// ipc
export { debounce } from "https://deno.land/std@0.207.0/async/mod.ts"
export { basename, dirname, join, resolve } from "https://deno.land/std@0.207.0/path/mod.ts"
// upgrader
export { gt, lt, parse as parseVersion } from "https://deno.land/std@0.207.0/semver/mod.ts"
export type { SemVer } from "https://deno.land/std@0.207.0/semver/mod.ts"

/**
 * Third party dependencies
 *
 * - Prefer deno.land/x when available
 */
export { Cron } from "https://deno.land/x/croner@7.0.5/dist/croner.js"
export { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"
export { installService, uninstallService } from "https://deno.land/x/service@1.0.0-rc.0/mod.ts"
export type { InstallServiceOptions, UninstallServiceOptions } from "https://deno.land/x/service@1.0.0-rc.0/mod.ts"
export { $ } from "https://deno.land/x/dax@0.35.0/mod.ts"
export { CommandChild } from "https://deno.land/x/dax@0.35.0/src/command.ts"
