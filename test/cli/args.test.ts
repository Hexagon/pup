import { assertEquals } from "../deps.ts"
import { parseArguments } from "../../lib/cli/args.ts"

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

    _: [],
  }
  assertEquals(parsedArgs, expectedArgs)
})
