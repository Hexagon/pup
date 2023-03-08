/**
 * Cli application entrypoint
 *
 * @file pup.ts
 */

import { Pup } from "./lib/pup.ts"
import { jsonc } from "./deps.ts"
import { checkArguments } from "./lib/checks.ts"
import { parseArguments } from "./lib/args.ts"
import { fileExists } from "./lib/utils.ts"
import { Configuration } from "./lib/configuration.ts";

// Parse arguments, null from parseArguments indicate that the program is already done, happens in case of --help
let args
try {
  args = checkArguments(parseArguments(Deno.args))
} catch (e) {
  console.error(e)
  Deno.exit(1)
}

// Quit instantly if --help or --version were present
if (args === null) Deno.exit(0)

// No configuration
let configFile: string | null = null

// Configuration from command line argument --config/-c
if (args?.config) {
  configFile = args.config
}

// Try default configuration file pup.json
if (!configFile || configFile === null) {
  if (await fileExists("./pup.json")) {
    configFile = "./pup.json"
  } else if (await fileExists("./pup.jsonc")) {
    configFile = "./pup.jsonc";
  }
}

// Exit if no configuration file were specified
if (configFile === null) {
  console.error("Could not start, no configuration file found")
  Deno.exit(1)
}

// Exit if specified configuration file is not found
if (!await fileExists(configFile)) {
  console.error("Could not start, specified configuration file not found")
  Deno.exit(1)
}

// Try to read configuration
let rawConfig
try {
  rawConfig = await Deno.readTextFile(configFile)
} catch (e) {
  console.error("Could not start, error reading configuration file", e)
  Deno.exit(1)
}

// Try to parse configuration
let configuration
try {
  configuration = jsonc.parse(rawConfig)
} catch (e) {
  console.error("Could not start, error parsing configuration file", e)
  Deno.exit(1)
}

// Try to initialize pup
try {
  await new Pup(configuration as Configuration)
} catch (e) {
  console.error("Could not start pup, invalid configuration:");
  console.error(e.toString())
  Deno.exit(1);
}