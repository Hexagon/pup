/**
 * Exports helper functions to parse and check arguments of Pup Cli program
 *
 * @file      lib/cli/args.ts
 * @license   MIT
 */

import { ArgsParser } from "@cross/utils/args"

/**
 * Parses command line arguments and returns a parsed object.
 *
 * @param args - An array of command line arguments.
 * @returns - A parsed object containing the command line arguments.
 */
function parseArguments(args: string[]): ArgsParser {
  const aliases = {
    "v": "version",
    "h": "help",
    "I": "id",
    "A": "autostart",
    "c": "config",
    "C": "cmd",
    "W": "worker",
    "w": "watch",
    "O": "cron",
    "T": "terminate",
    "d": "cwd",
    "upgrade": "update",
    "e": "env",
  }
  const boolean = ["setup", "upgrade", "help", "version", "autostart", "dry-run"]
  return new ArgsParser(args, { aliases, boolean })
}

/**
 * Checks the parsed arguments and throws an error if any of the arguments are invalid.
 * @param args - The parsed arguments.
 * @returns - The parsed and checked arguments.
 * @throws - An error if any of the arguments are invalid.
 */
function checkArguments(args: ArgsParser): ArgsParser {
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
    "setup",
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

  const installerOptions = [
    "channel",
    "local",
  ]

  // Check that the base argument is either undefined or valid
  const baseArgument = args.countLoose() > 0 ? args.getLoose()[0] : undefined;
  if (baseArgument !== undefined && (typeof baseArgument !== "string" || !validBaseArguments.includes(baseArgument))) {
    throw new Error(`Invalid base argument: ${baseArgument}`)
  }

  const hasDoubleDashCmd = args.hasRest()
  const hasCmd = hasDoubleDashCmd || args.get("cmd") || args.get("worker")
  const expectConfigOptions = baseArgument === "init" || baseArgument === "append" || (baseArgument === "run" && hasCmd)
  const expectInstallerOptions = baseArgument === "setup" || baseArgument === "upgrade" || baseArgument === "update"

  // Only one type of command can be present at the same time
  if ((hasDoubleDashCmd && args.get("cmd")) || (args.get("cmd") && args.get("worker")) || (hasDoubleDashCmd && args.get("worker"))) {
    throw new Error("'--cmd', '--worker' and '--' cannot be used at the same time.")
  }

  // Certain base arguments require --id
  if (!args.get("id") && (baseArgument === "init" || baseArgument === "append" || baseArgument === "remove")) {
    throw new Error("Arguments 'init', 'append', and 'remove' require '--id'")
  }

  // Init and append require a command
  if ((args.get("init") || args.get("append")) && !hasCmd) {
    throw new Error("Arguments 'init' and 'append' requires '--cmd' or '--worker'")
  }

  // Do not allow configuration creation options without init and vice versa
  if (hasCmd && !expectConfigOptions) {
    throw new Error("Argument '--cmd' or '--worker' requires 'init', 'append' or 'run' without config")
  }

  // All arguments in processOptions require that init, append, cmd och worker is used
  for (const opt of processOptions) {
    if (args.get(opt) && !expectConfigOptions) {
      throw new Error(`Argument '--${opt}' requires 'init', 'append', '--cmd' or '--worker'`)
    }
  }

  // All arguments in installerOptions require that setup or upgrade (or update) is used
  for (const opt of installerOptions) {
    if (args.get(opt) && !expectInstallerOptions) {
      throw new Error(`Argument '--${opt}' requires 'setup' or 'upgrade'`)
    }
  }

  // All arguments in numericArguments must be numeric
  for (const opt of numericArguments) {
    if (args.get(opt) && isNaN(Number(args.get(opt)))) {
      throw new Error(`Argument '--${opt}' must be a numeric value`)
    }
  }

  // --env flag can only be used with 'service install' base argument
  if (args.get("env") && (baseArgument !== "install")) {
    throw new Error("Argument '--env' can only be used with 'service install' base argument")
  }

  return args
}

export { checkArguments, parseArguments }
