/**
 * Exports helper functions to parse and check arguments of Pup Cli program
 *
 * @file      lib/cli/args.ts
 * @license   MIT
 */

import { Args, parse } from "../../deps.ts"

/**
 * Parses command line arguments and returns a parsed object.
 *
 * @param args - An array of command line arguments.
 * @returns - A parsed object containing the command line arguments.
 */
function parseArguments(args: string[]): Args {
  // All boolean arguments
  const booleanArgs = [
    "version",
    "help",
    "init",
    "append",
    "autostart",
    "remove",
    "status",
    "no-config",
  ]

  // All string arguments
  const stringArgs = [
    "config",
    "watch",
    "cmd",
    "cwd",
    "id",
    "cron",

    "restart",
    "start",
    "stop",
    "block",
    "unblock",

    "terminate",
  ]

  // And a list of aliases
  const alias = {
    "version": "v",
    "help": "h",
    "init": "i",
    "id": "I",
    "append": "a",
    "autostart": "A",
    "remove": "r",
    "status": "s",
    "no-config": "n",
    "config": "c",
    "cmd": "C",
    "watch": "w",
    "cron": "O",
    "cwd": "W",
  }

  return parse(args, { alias, boolean: booleanArgs, string: stringArgs, stopEarly: true })
}

function checkArguments(args: Args): Args {
  const configOptions = args.init || args.append || args["no-config"]

  // Do not allow configuration creation options without --init and vice versa
  if (args.autostart && !configOptions) {
    throw new Error("Argument '--autostart' requires '--init', '--append' or '--no-config'")
  }
  if (args.cron && !configOptions) {
    throw new Error("Argument '--cron' requires '--init', '--append' or '--no-config'")
  }
  if (args.watch && !configOptions) {
    throw new Error("Argument '--watch' requires '--init', '--append' or '--no-config'")
  }
  if (args.cmd && !configOptions) {
    throw new Error("Argument '--cmd' requires '--init', '--append' or '--no-config'")
  }
  if (!args.cmd && configOptions) {
    throw new Error("Arguments '--init', '--append', and '--no-config' require '--cmd'")
  }
  if (!args.id && (args.init || args.append || args.remove)) {
    throw new Error("Arguments '--init','--append', and '--remove' require '--id'")
  }
  if (args["no-config"] && !args.cmd) {
    throw new Error("Argument '--no-config' requires '--cmd'")
  }

  return args
}

export { checkArguments, parseArguments }
