import { assertEquals } from "../deps.ts"
import { AttachedLogger, Logger } from "../../lib/core/logger.ts"

Deno.test("Creating Logger instance with global configuration", () => {

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

Deno.test("Attaching an external logger", () => {

  let externalLoggerCalled = false
  let externalLoggerText = ""
  const expectedExteralLoggerText = "Testing attached logger"
  const externalLogger: AttachedLogger = (
    _severity,
    _category,
    _text,
    _config,
    _process,
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

Deno.test("Logging with different methods", () => {

  const logger = new Logger({ console: false })

  logger.log("test", "Testing log method")
  logger.info("test", "Testing info method")
  logger.warn("test", "Testing warn method")
  logger.error("test", "Testing error method")

  assertEquals(true, true) // This is just to assert that the test passed if no errors are thrown

})

Deno.test("Writing to a file with writeFile", async () => {

  const logger = new Logger({ console: false })
  const testFileName = "test_writeFile.log"
  const testText = "Testing writeFile"
  await logger["writeFile"](testFileName, testText)

  const fileContent = await Deno.readTextFile(testFileName)
  assertEquals(fileContent, `${testText}\n`)

  await Deno.remove(testFileName)
  
})
