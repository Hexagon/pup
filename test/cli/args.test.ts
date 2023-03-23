import { checkArguments, parseArguments } from "../../lib/cli/args.ts"
import { assertEquals, assertThrows, spy } from "../deps.ts"
import { Application } from "../../application.meta.ts"
import { printHeader, printUsage } from "../../lib/cli/output.ts"

Deno.test("Boolean options and aliases are parsed correctly", () => {
  const inputArgs = [
    "--version",
    "--help",
    "--init",
    "--append",
    "--autostart",
    "--remove",
    "--status",
    "--no-config",
  ]
  const parsedArgs = parseArguments(inputArgs)
  const expectedArgs = {
    /* Specified */
    version: true,
    v: true,

    help: true,
    h: true,

    init: true,
    i: true,

    append: true,
    a: true,

    autostart: true,
    A: true,

    remove: true,
    r: true,

    status: true,
    s: true,

    "no-config": true,
    n: true,

    terminate: false,

    _: [],
  }
  assertEquals(parsedArgs, expectedArgs)
})

Deno.test("String options and aliases are parsed correctly", () => {
  const inputArgs = [
    "--config",
    "config.json",
    "--watch",
    "watched.ts",
    "--cmd",
    "command",
    "--cwd",
    "cwd",
    "--id",
    "id",
    "--cron",
    "cron",
  ]
  const parsedArgs = parseArguments(inputArgs)
  const expectedArgs = {
    /* Specified */
    config: "config.json",
    c: "config.json",

    watch: "watched.ts",
    w: "watched.ts",

    cmd: "command",
    C: "command",

    cwd: "cwd",
    W: "cwd",

    id: "id",
    I: "id",

    cron: "cron",
    O: "cron",

    /* All boolean options will be included in output too */
    version: false,
    v: false,
    help: false,
    h: false,
    init: false,
    i: false,
    append: false,
    a: false,
    autostart: false,
    A: false,
    remove: false,
    r: false,
    status: false,
    s: false,
    "no-config": false,
    n: false,
    terminate: false,

    _: [],
  }
  assertEquals(parsedArgs, expectedArgs)
})

Deno.test("checkArguments should throw error when autostart argument is provided without init, append or no-config", async () => {
  const args = { _: [], autostart: true }
  await assertThrows(
    () => {
      checkArguments(args, [])
    },
    Error,
    "Argument '--autostart' requires '--init', '--append' or '--no-config'",
  )
})

Deno.test("checkArguments should throw error when cron argument is provided without init or append", async () => {
  const args = { _: [], cron: true }
  await assertThrows(
    () => {
      checkArguments(args, [])
    },
    Error,
    "Argument '--cron' requires '--init', '--append' or '--no-config'",
  )
})

Deno.test("checkArguments should throw error when watch argument is provided without init or append", async () => {
  const args = { _: [], watch: "path" }
  await assertThrows(
    () => {
      checkArguments(args, [])
    },
    Error,
    "Argument '--watch' requires '--init', '--append' or '--no-config'",
  )
})

Deno.test("checkArguments should throw error when cmd argument is provided without init, append or no-config", async () => {
  const args = { _: [], cmd: "command" }
  await assertThrows(
    () => {
      checkArguments(args, [])
    },
    Error,
    "Argument '--cmd' requires '--init', '--append' or '--no-config'",
  )
})

Deno.test("checkArguments should throw error when init or append argument is provided without cmd", async () => {
  const args = { _: [], init: true }
  await assertThrows(
    () => {
      checkArguments(args, [])
    },
    Error,
    "Arguments '--init', '--append', and '--no-config' require '--cmd'",
  )
})

Deno.test("checkArguments should throw error when both --cmd and -- is specified", async () => {
  const args = { _: [], cmd: "hello world", init: true, id: "test" }
  await assertThrows(
    () => {
      checkArguments(args, ["hello", "world"])
    },
    Error,
    "Both '--cmd' and '--' cannot be used at the same time.",
  )
})

Deno.test("checkArguments should throw error when id argument is missing with init or append argument", async () => {
  const args = { _: [], init: true, cmd: "command" }
  await assertThrows(
    () => {
      checkArguments(args, [])
    },
    Error,
    "Arguments '--init','--append', and '--remove' require '--id'",
  )
})

Deno.test("printHeader should output the name, version, and repository of the application", () => {
  const expectedName = "pup"
  const expectedRepository = "https://github.com/hexagon/pup"
  const consoleSpy = spy(console, "log")
  printHeader()
  assertEquals(
    consoleSpy.calls[0].args[0],
    `${expectedName} ${Application.version}`,
  )
  assertEquals(
    consoleSpy.calls[1].args[0],
    expectedRepository,
  )
  consoleSpy.restore()
})

Deno.test("printUsage should output the usage of the application", () => {
  const consoleSpy = spy(console, "log")
  printUsage()
  const expectedOutput = `Usage: ${Application.name} [OPTIONS...]`
  assertEquals(consoleSpy.calls[0].args[0], expectedOutput)
  consoleSpy.restore()
})

Deno.test("checkArguments should return the provided arguments when they are valid", () => {
  const expectedArgs = {
    _: [],
    init: true,
    cmd: "command",
    id: "taskId",
  }
  const result = checkArguments(expectedArgs, [])
  assertEquals(result, expectedArgs)
})
