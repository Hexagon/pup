import { assertEquals } from "../deps.ts"
import { AttachedLogger, Logger } from "../../lib/core/logger.ts"
import { ProcessConfiguration } from "../../mod.ts"

Deno.test("Logger - Creation with Global Configuration", () => {
  const globalConfig = {
    console: false,
    colors: true,
    decorate: false,
    stdout: "test_stdout.log",
    stderr: "test_stderr.log",
  }

  const logger = new Logger(globalConfig)

  assertEquals(logger instanceof Logger, true)
})

Deno.test("Logger - Attachment of External Logger", () => {
  let externalLoggerCalled = false
  let externalLoggerText = ""
  const expectedExteralLoggerText = "Testing attached logger"
  const externalLogger: AttachedLogger = (
    _severity: string,
    _category: string,
    _text: string,
    _process?: ProcessConfiguration,
  ) => {
    externalLoggerCalled = true
    externalLoggerText = _text
    return false
  }

  const logger = new Logger({})
  logger.attach(externalLogger)
  logger.log("test", expectedExteralLoggerText)

  assertEquals(externalLoggerCalled, true)
  assertEquals(externalLoggerText, expectedExteralLoggerText)
})

Deno.test("Logger - Logging with Different Methods", () => {
  const logger = new Logger({ console: false })

  logger.log("test", "Testing log method")
  logger.info("test", "Testing info method")
  logger.warn("test", "Testing warn method")
  logger.error("test", "Testing error method")

  assertEquals(true, true) // This is just to assert that the test passed if no errors are thrown
})

Deno.test("Logger - File Writing with writeFile Method", async () => {
  const logger = new Logger({ console: false })
  const testFileName = "test_writeFile.log"
  const testText = "Testing writeFile"
  await logger["writeFile"](testFileName, testText)

  const fileContent = await Deno.readTextFile(testFileName)
  assertEquals(fileContent, `${testText}\n`)

  await Deno.remove(testFileName)
})
