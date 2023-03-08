/**
 * Re-exports the required methods and types from remote modules
 *
 * @file deps.ts
 */

/* Deno std dependencies */
export { readLines } from "https://deno.land/std@0.178.0/io/mod.ts"

import { Args, parse } from "https://deno.land/std@0.178.0/flags/mod.ts"
export type { Args }
export { parse }

export * as jsonc from "https://deno.land/std@0.178.0/encoding/jsonc.ts"

/* Third party dependencies */
export { Cron } from "https://deno.land/x/croner@6.0.2/dist/croner.js"
export { z } from "https://deno.land/x/zod@v3.21.4/mod.ts"
