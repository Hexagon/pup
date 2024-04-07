import { checkArguments, parseArguments } from "../../lib/cli/args.ts"
import { assertEquals, assertThrows } from "@std/assert"
import { spy } from "@std/testing/mock"
import { Application } from "../../application.meta.ts"
import { printHeader, printUsage } from "../../lib/cli/output.ts"
import { ArgsParser } from "@cross/utils"

Deno.test("Boolean options and aliases are parsed correctly", () => {
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
  console.log(parsedArgs.getLoose())
  assertEquals(parsedArgs.getLoose().includes("init"), true)
  assertEquals(parsedArgs.getLoose().includes("append"), true)
  assertEquals(parsedArgs.getLoose().includes("status"), true)
  assertEquals(parsedArgs.getLoose().includes("remove"), true)
  assertEquals(parsedArgs.getLoose().includes("run"), true)
  assertEquals(parsedArgs.getBoolean("cmd"), true)
})

Deno.test("String options and aliases are parsed correctly", () => {
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
/*
Deno.test("checkArguments should throw error when autostart argument is provided without init, append or --cmd", async () => {
  const args = new ArgsParser(["--cron"])
  assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--autostart' requires 'init', 'append', '--cmd' or '--worker'",
  )
})

Deno.test("checkArguments should throw error when cron argument is provided without init or append", async () => {
  const args = new ArgsParser(["cron"])
  assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--cron' requires 'init', 'append', '--cmd' or '--worker'"
  )
})

Deno.test("checkArguments should throw error when terminate argument is provided without init or append", async () => {
  const args = { _: [], terminate: true }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--terminate' requires 'init', 'append', '--cmd' or '--worker'",
  )
})

Deno.test("checkArguments should throw error when watch argument is provided without init or append", async () => {
  const args = { _: [], watch: "path" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--watch' requires 'init', 'append', '--cmd' or '--worker'",
  )
})

Deno.test("checkArguments should throw error when cmd argument is provided without init, append or run", async () => {
  const args = { _: [], cmd: "command" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--cmd' or '--worker' requires 'init', 'append' or 'run' without config",
  )
})

Deno.test("checkArguments should throw error when worker argument is provided without init, append or run", async () => {
  const args = new ArgsParser(["--worker", "command"]);
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--cmd' or '--worker' requires 'init', 'append' or 'run' without config",
  )
})

Deno.test("checkArguments should throw error when init or append argument is provided without cmd", async () => {
  const args = new ArgsParser(["init"]);
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Arguments 'init' and 'append' requires '--cmd' or '--worker'",
  )
})

Deno.test("checkArguments should throw error when both --cmd and -- is specified", async () => {
  const args = { _: [], ["--"]: "hello", cmd: "hello world", init: true, id: "test" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "'--cmd', '--worker' and '--' cannot be used at the same time.",
  )
})

Deno.test("checkArguments should throw error when id argument is missing with init or append argument", async () => {
  const args = { _: ["init"], cmd: "command" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Arguments 'init', 'append', and 'remove' require '--id'",
  )
})

Deno.test("checkArguments should throw error when id argument is missing with init or append argument", async () => {
  const args = { _: ["append"], cmd: "command" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Arguments 'init', 'append', and 'remove' require '--id'",
  )
})

Deno.test("checkArguments should throw error when id argument is missing with init or remove argument", async () => {
  const args = { _: ["remove"], cmd: "command" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Arguments 'init', 'append', and 'remove' require '--id'",
  )
})

Deno.test("printHeader should output the name, version, and repository of the application", () => {
  const expectedName = "pup"
  const expectedRepository = "https://github.com/hexagon/pup"
  const consoleSpy = spy(console, "log")
  printHeader()
  assertEquals(
    consoleSpy.calls[0].args[0],
    `${expectedName} ${Application.version}\n${expectedRepository}`,
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
    _: ["init"],
    cmd: "command",
    id: "taskId",
  }
  const result = checkArguments(expectedArgs)
  assertEquals(result, expectedArgs)
})

Deno.test("checkArguments should throw error when --env argument is provided without service install", async () => {
  const args = { _: [], env: "NODE_ENV=production" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--env' can only be used with 'service install' base argument",
  )
})

Deno.test("checkArguments should return the provided arguments when service install and --env are used together", () => {
  const expectedArgs = {
    _: ["install"],
    env: "NODE_ENV=production",
  }
  const result = checkArguments(expectedArgs)
  assertEquals(result, expectedArgs)
})

Deno.test("Collect env arguments formatted as KEY=VALUE", () => {
  const inputArgs = [
    "--env",
    "KEY1=VALUE1",
    "--env",
    "KEY2=VALUE2",
  ]
  const parsedArgs = parseArguments(inputArgs)
  const expectedArgs = {
    env: ["KEY1=VALUE1", "KEY2=VALUE2"],
    e: ["KEY1=VALUE1", "KEY2=VALUE2"],

    // All boolean options will be included in output too
    help: false,
    h: false,
    autostart: false,
    A: false,
    "dry-run": false,
    setup: false,
    upgrade: false,
    update: false,

    // Unspecified string options will not be included
    _: [],
    "--": [],
  }
  assertEquals(parsedArgs, expectedArgs)
})

Deno.test("checkArguments should throw error when both --cmd and --worker are specified", async () => {
  const args = { _: [], cmd: "command", worker: "worker_script", init: true, id: "test" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "'--cmd', '--worker' and '--' cannot be used at the same time.",
  )
})

Deno.test("checkArguments should allow both --cwd and --id when used together", () => {
  const args = { _: ["init"], cmd: "command", id: "test", cwd: "cwd" }
  const result = checkArguments(args)
  assertEquals(result, args)
})

Deno.test("checkArguments should allow --terminate when used with --worker", () => {
  const args = { _: ["init"], worker: "worker_script", id: "test", terminate: "terminate" }
  const result = checkArguments(args)
  assertEquals(result, args)
})

Deno.test("checkArguments should allow --watch when used with --worker", () => {
  const args = { _: ["init"], worker: "worker_script", id: "test", watch: "watched.ts" }
  const result = checkArguments(args)
  assertEquals(result, args)
})

Deno.test("checkArguments should allow --instances when used with init", () => {
  const args = { _: ["init"], cmd: "command", id: "test", instances: 2 }
  const result = checkArguments(args)
  assertEquals(result, args)
})

Deno.test("checkArguments should allow --instances when used with append", () => {
  const args = { _: ["append"], cmd: "command", id: "test", instances: 2 }
  const result = checkArguments(args)
  assertEquals(result, args)
})

Deno.test("checkArguments should allow --instances when used with run", () => {
  const args = { _: ["run"], cmd: "command", instances: 2 }
  const result = checkArguments(args)
  assertEquals(result, args)
})

Deno.test("checkArguments should allow --start-port when used with init", () => {
  const args = { _: ["init"], cmd: "command", id: "test", startPort: 3000 }
  const result = checkArguments(args)
  assertEquals(result, args)
})

Deno.test("checkArguments should allow --start-port when used with append", () => {
  const args = { _: ["append"], cmd: "command", id: "test", startPort: 3000 }
  const result = checkArguments(args)
  assertEquals(result, args)
})

Deno.test("checkArguments should allow --start-port when used with run", () => {
  const args = { _: ["run"], cmd: "command", startPort: 3000 }
  const result = checkArguments(args)
  assertEquals(result, args)
})

Deno.test("checkArguments should allow --instances and --start-port when used together", () => {
  const args = { _: ["init"], cmd: "command", id: "test", instances: 2, startPort: 3000 }
  const result = checkArguments(args)
  assertEquals(result, args)
})

Deno.test("checkArguments should throw error when --start-port value is not a number", async () => {
  const args = { _: ["init"], cmd: "command", id: "test", "start-port": "invalid" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--start-port' must be a numeric value",
  )
})

Deno.test("checkArguments should throw error when --instances value is not a number", async () => {
  const args = { _: ["init"], cmd: "command", id: "test", instances: "invalid" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--instances' must be a numeric value",
  )
})

Deno.test("checkArguments should throw error when --common-port value is not a number", async () => {
  const args = { _: ["init"], cmd: "command", id: "test", "common-port": "invalid" }
  await assertThrows(
    () => {
      checkArguments(args)
    },
    Error,
    "Argument '--common-port' must be a numeric value",
  )
})
*/
