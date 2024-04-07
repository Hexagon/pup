// test/cli/output.test.ts

import { createFlagsMessage, createHeaderMessage, createUsageMessage } from "../../lib/cli/output.ts"
import { Application } from "../../application.meta.ts"
import { assertEquals } from "@std/assert"

Deno.test("Should correctly create the header message", () => {
  const expected = Application.name + " " + Application.version + "\n" + Application.repository
  const actual = createHeaderMessage()
  assertEquals(actual, expected)
})

Deno.test("Should correctly create the usage message", () => {
  const expected = `Usage: ${Application.name} [OPTIONS...]`
  const actual = createUsageMessage()
  assertEquals(actual, expected)
})

Deno.test("Should correctly create the flags message for external installer", () => {
  const actual = createFlagsMessage(true)
  assertEquals(actual.includes("Restart process using IPC"), true)
  assertEquals(actual.includes("Install or upgrade pup"), false)
})

Deno.test("Should correctly create the flags message for non-external installer", () => {
  const actual = createFlagsMessage(false)
  assertEquals(actual.includes("Restart process using IPC"), true)
  assertEquals(actual.includes("Install or upgrade pup"), true)
})
