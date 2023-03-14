import { assertEquals } from "../deps.ts"
import { parseArguments } from "../../lib/cli/args.ts"

Deno.test("parseArguments should return expected arguments object when full options are used", () => {
  const args = ["--id", "test", "--init", "--config", "test.sh", "--watch", "--version", "--cmd", "test.ts", "--cwd", "/test"]
  const expectedOutput = {
    _: [],

    help: false,
    h: false,

    version: true,
    v: true,

    id: "test",

    cmd: "test.ts",

    cwd: "/test",

    config: "test.sh",
    c: "test.sh",

    autostart: false,
    u: false,

    watch: true,
    w: true,

    init: true,
    i: true,

    remove: false,
    r: false,

    append: false,
    a: false,

    status: false,
    s: false,
  }
  assertEquals(parseArguments(args), expectedOutput)
})

Deno.test("parseArguments should return expected arguments object when aliases are used", () => {
  const args = ["--id", "test", "-i", "-c", "test.sh", "-w", "-v"]
  const expectedOutput = {
    _: [],

    help: false,
    h: false,

    version: true,
    v: true,

    id: "test",

    c: "test.sh",
    config: "test.sh",

    watch: true,
    w: true,

    init: true,
    i: true,

    remove: false,
    r: false,

    append: false,
    a: false,

    status: false,
    s: false,

    autostart: false,
    u: false,
  }
  assertEquals(parseArguments(args), expectedOutput)
})
