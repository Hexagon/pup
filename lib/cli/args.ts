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

export { parseArguments }
