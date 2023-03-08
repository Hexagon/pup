/**
 * Cli application entrypoint
 *
 * @file pup.ts
 */

import { pup } from "./lib/pup.ts"
import { checkArguments } from "./lib/checks.ts"
import { parseArguments } from "./lib/args.ts"

// Parse arguments, null from parseArguments indicate that the program is already done, happens in case of --help
try {
  const args = checkArguments(parseArguments(Deno.args))
  
  // Quit instantly if --help or --version were present
  if (args === null) Deno.exit(0);
  
  // No configuration
  let configFile: string | null = null

  // Configuration from command line argument --config/-c
  if (args?.config) {
    configFile = args.config
  }

  // Try default configuration file
  if (!configFile || configFile === null) {
    configFile = "./pup.json"
  }

  // Go!
  try {
    const rawFile = await Deno.readTextFile(configFile)
    const parsedFile = JSON.parse(rawFile)
    await pup(parsedFile?.processes)
  } catch (e) {
    console.error("Could not start, error reading configuration file", e)
    Deno.exit(1)
  }
} catch (e) {
  console.error(e)
  Deno.exit(1)
}
