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
    "autostart",

    "dry-run",
  ]

  // All string arguments
  const stringArgs = [
    "config",
    "watch",
    "cmd",
    "worker",
    "cwd",
    "id",

    "cron",
    "terminate",

    "upgrade",

    "instances",
    "start-port",
    "common-port",
    "strategy",
    "stdout",
    "stderr",
  ]

  // All collection arguments
  const collectArgs = [
    "env",
  ]

  // And a list of aliases
  const alias = {
    "version": "v",
    "help": "h",
    "id": "I",
    "autostart": "A",
    "config": "c",
    "cmd": "C",
    "worker": "W",
    "watch": "w",
    "cron": "O",
    "terminate": "T",
    "cwd": "d",
    "update": "upgrade",
    "env": "e",
  }

  return parse(args, { alias, boolean: booleanArgs, string: stringArgs, collect: collectArgs, stopEarly: false, "--": true })
}

/**
 * Checks the parsed arguments and throws an error if any of the arguments are invalid.
 * @param args - The parsed arguments.
 * @returns - The parsed and checked arguments.
 * @throws - An error if any of the arguments are invalid.
 */
function checkArguments(args: Args): Args {
  const validBaseArguments = [
    "init",
    "append",
    "remove",
    "status",
    "terminate",
    "start",
    "stop",
    "restart",
    "block",
    "unblock",
    "run",
    "install",
    "uninstall",
    "logs",
    "upgrade",
    "update",
    "help",
    "version",
  ]

  const numericArguments = [
    "instances",
    "start-port",
    "common-port",
  ]

  const processOptions = [
    "autostart",
    "cron",
    "terminate",
    "watch",
    "instances",
    "start-port",
    "common-port",
    "strategy",
    "stdout",
    "stderr",
  ]

  // Check that the base argument is either undefined or valid
  const baseArgument = args._[0]
  if (baseArgument !== undefined && (typeof baseArgument !== "string" || !validBaseArguments.includes(baseArgument))) {
    throw new Error(`Invalid base argument: ${baseArgument}`)
  }

  const hasDoubleDashCmd = args["--"] && args["--"].length > 0
  const hasCmd = hasDoubleDashCmd || args.cmd || args.worker
  const expectConfigOptions = baseArgument === "init" || baseArgument === "append" || (baseArgument === "run" && hasCmd)

  // Only one type of command can be present at the same time
  if ((hasDoubleDashCmd && args.cmd) || (args.cmd && args.worker) || (hasDoubleDashCmd && args.worker)) {
    throw new Error("'--cmd', '--worker' and '--' cannot be used at the same time.")
  }

  // Certain base arguments require --id
  if (!args.id && (baseArgument === "init" || baseArgument === "append" || baseArgument === "remove")) {
    throw new Error("Arguments 'init', 'append', and 'remove' require '--id'")
  }

  // Init and append require a command
  if ((args.init || args.append) && !hasCmd) {
    throw new Error("Arguments 'init' and 'append' requires '--cmd' or '--worker'")
  }

  // Do not allow configuration creation options without init and vice versa
  if (hasCmd && !expectConfigOptions) {
    throw new Error("Argument '--cmd' or '--worker' requires 'init', 'append' or 'run' without config")
  }

  // All arguments in processOptions require that init, append, cmd och worker is used
  for (const opt of processOptions) {
    if (args[opt] && !expectConfigOptions) {
      throw new Error(`Argument '--${opt}' requires 'init', 'append', '--cmd' or '--worker'`)
    }
  }

  // All arguments in numericArguments must be numeric
  for (const opt of numericArguments) {
    if (args[opt] && isNaN(Number(args[opt]))) {
      throw new Error(`Argument '--${opt}' must be a numeric value`)
    }
  }

  // --env flag can only be used with 'service install' base argument
  if (args.env && (baseArgument !== "install")) {
    throw new Error("Argument '--env' can only be used with 'service install' base argument")
  }

  return args
}

export { checkArguments, parseArguments }
