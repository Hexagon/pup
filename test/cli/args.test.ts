import { checkArguments, parseArguments } from "../../lib/cli/args.ts"
import { assertEquals, assertThrows } from "@std/assert"

import { ArgsParser } from "@cross/utils"
import { test } from "@cross/test"

test("Boolean options and aliases are parsed correctly", () => {
  const inputArgs = [
    "--version",
    "--help",
    "--autostart",
    "init",
    "append",
    "status",
    "remove",
    "run",
    "--cmd",
  ]
  const parsedArgs = parseArguments(inputArgs)
  assertEquals(parsedArgs.getBoolean("version"), true)
  assertEquals(parsedArgs.getBoolean("help"), true)
  assertEquals(parsedArgs.getBoolean("autostart"), true)
  assertEquals(parsedArgs.getLoose().includes("init"), true)
  assertEquals(parsedArgs.getLoose().includes("append"), true)
  assertEquals(parsedArgs.getLoose().includes("status"), true)
  assertEquals(parsedArgs.getLoose().includes("remove"), true)
  assertEquals(parsedArgs.getLoose().includes("run"), true)
  assertEquals(parsedArgs.getBoolean("cmd"), true)
})

test("String options and aliases are parsed correctly", () => {
  const inputArgs = [
    "--config",
    "config.json",
    "--watch",
    "watched.ts",
    "--cmd",
    "command",
    "--worker",
    "worker_script",
    "--cwd",
    "cwd",
    "--id",
    "id",
    "--cron",
    "cron",
    "--terminate",
    "terminate",
    "--dry-run",
  ]
  const parsedArgs = parseArguments(inputArgs)
  assertEquals(parsedArgs.get("config"), "config.json")
  assertEquals(parsedArgs.get("watch"), "watched.ts")
  assertEquals(parsedArgs.get("cmd"), "command")
  assertEquals(parsedArgs.getBoolean("dry-run"), true)
})

test("checkArguments should throw error when autostart argument is provided without init, append or --cmd", () => {
  const args = new ArgsParser(["--autostart"], { boolean: ["autostart"] })
  assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--autostart' requires 'init', 'append', '--cmd' or '--worker'",
  )
})

test("checkArguments should throw error when cron argument is provided without init or append", () => {
  const args = new ArgsParser(["--cron", "* * * * *"])
  assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--cron' requires 'init', 'append', '--cmd' or '--worker'",
  )
})

test("checkArguments should throw error when terminate argument is provided without init or append", () => {
  const args = new ArgsParser(["--terminate", "* * * * *"])
  assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--terminate' requires 'init', 'append', '--cmd' or '--worker'",
  )
})

test("checkArguments should throw error when watch argument is provided without init or append", () => {
  const args = new ArgsParser(["--watch", "path"])
  assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--watch' requires 'init', 'append', '--cmd' or '--worker'",
  )
})

test("checkArguments should throw error when cmd argument is provided without init, append or run", () => {
  const args = new ArgsParser(["--cmd", "command"])
  assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--cmd' or '--worker' requires 'init', 'append' or 'run' without config",
  )
})

test("checkArguments should throw error when worker argument is provided without init, append or run", () => {
  const args = new ArgsParser(["--worker", "command"])
  assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--cmd' or '--worker' requires 'init', 'append' or 'run' without config",
  )
})

test("checkArguments should throw error when init or append argument is provided without cmd", () => {
  const args = new ArgsParser(["init"])
  assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Arguments 'init', 'append', and 'remove' require '--id'",
  )
})

test("checkArguments should throw error when both --cmd and -- is specified", () => {
  const args = new ArgsParser(["--cmd", "command", "--", "command"])
  assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "'--cmd', '--worker' and '--' cannot be used at the same time.",
  )
})
