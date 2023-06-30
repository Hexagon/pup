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
export { parse } from "std/flags/mod.ts"
export type { Args } from "std/flags/mod.ts"
export * as path from "std/path/mod.ts"
export * as uuid from "std/uuid/mod.ts"
// logger
export { stripColor } from "std/fmt/colors.ts"
// config
export * as jsonc from "std/jsonc/mod.ts"
// watcher
export { deferred, delay } from "std/async/mod.ts"
export { globToRegExp, relative } from "std/path/mod.ts"
// load balancer
export { copy } from "std/streams/mod.ts"
// core - process
export { StringReader } from "std/io/string_reader.ts"
export { readLines } from "std/io/mod.ts"
// service installer, release tool
export { existsSync } from "std/fs/mod.ts"
// ipc
export { debounce } from "std/async/mod.ts"
export { basename, dirname, join, resolve } from "std/path/mod.ts"
// upgrader
export { gt, lt, parse as parseVersion } from "std/semver/mod.ts"
export type { SemVer } from "std/semver/mod.ts"

/**
 * Third party dependencies
 *
 * - Prefer deno.land/x when available
 */
export { Cron } from "croner/dist/croner.js"
export { z } from "zod/mod.ts"
export { installService, uninstallService } from "service/mod.ts"
export type { InstallServiceOptions, UninstallServiceOptions } from "service/mod.ts"
export { $ } from "dax/mod.ts"
export { CommandChild } from "dax/src/command.ts"
