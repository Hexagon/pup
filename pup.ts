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

  // No configuration
  let configFile: string|null = null;

  // Configuration from command line argument --config/-c
  if (args?.config) {
    configFile = args.config;
  }

  // Try default configuration file
  if (!configFile || configFile === null) {
    configFile = "./pup.json";
  }

  // Go!
  try {
    const rawFile = await Deno.readTextFile(configFile)
    await pup(JSON.parse(rawFile))

  } catch (_e) {
    console.error("Could not start, no configuration found.")
    Deno.exit(1)
  }

} catch (e) {
  console.error(e);
  Deno.exit(1)
}
