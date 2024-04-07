/*
import { main } from "../lib/main.ts"
import { assertSpyCall, spy } from "@std/testing/mock"

Deno.test("main: exit with --version flag", async () => {
  const exitSpy = spy(Deno, "exit")
  const args = ["--version"]

  await main(args)

  assertSpyCall(exitSpy, 0)

  exitSpy.restore()
})

Deno.test("main: exit with --help flag", async () => {
  const exitSpy = spy(Deno, "exit")
  const args = ["--help"]

  await main(args)

  assertSpyCall(exitSpy, 0)

  exitSpy.restore()
})

Deno.test("main: exit when no configuration file found", async () => {
  const exitSpy = spy(Deno, "exit")
  const originalFileExists = Deno.stat

  Deno.stat = () => {
    throw new Deno.errors.NotFound("File not found")
  }
  const args: string[] = []

  await main(args)

  assertSpyCall(exitSpy, 1)

  Deno.stat = originalFileExists
})
*/
