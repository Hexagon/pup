/**
 * Re-exports the required methods and types from remote modules
 *
 * @file deps.ts
 */

export { Cron } from "https://deno.land/x/croner@6.0.2/dist/croner.js"

import { Args, parse } from "https://deno.land/std@0.114.0/flags/mod.ts"
export type { Args }
export { parse }
