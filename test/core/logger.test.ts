import { assertEquals } from "@std/assert"
import { type AttachedLogger, type LogEventData, Logger } from "../../lib/core/logger.ts"
import type { ProcessConfiguration } from "../../mod.ts"
import { test } from "@cross/test"
import { readFile, tempfile, unlink } from "@cross/fs"

test("Logger - Creation with Global Configuration", () => {
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

test("Logger - Attachment of External Logger", async () => {
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
  await logger.log("test", expectedExteralLoggerText)

  assertEquals(externalLoggerCalled, true)
  assertEquals(externalLoggerText, expectedExteralLoggerText)
})

test("Logger - Logging with Different Methods", async () => {
  const logger = new Logger({ console: false })

  await logger.log("test", "Testing log method")
  await logger.info("test", "Testing info method")
  await logger.warn("test", "Testing warn method")
  await logger.error("test", "Testing error method")

  assertEquals(true, true) // This is just to assert that the test passed if no errors are thrown
})

test("Logger - File Writing with writeFile Method", async () => {
  const logger = new Logger({ console: false })
  const testFileName = "test_writeFile.log"
  const testText = "Testing writeFile"
  await logger["writeFile"](testFileName, testText)

  const fileContentData = await readFile(testFileName)
  const fileContent = new TextDecoder().decode(fileContentData)
  assertEquals(fileContent, `${testText}\n`)

  await unlink(testFileName)
})

test("Logger - getLogContents: Fetch all logs", async () => {
  const logger = new Logger({}, await tempfile())
  await logger.init()

  const expectedLogs: LogEventData[] = [
    { severity: "info", category: "test1", text: "Log 1", processId: "process-1", timeStamp: 1623626400000 },
    { severity: "warn", category: "test2", text: "Log 2", processId: "process-2", timeStamp: 1623626500000 },
    { severity: "error", category: "test3", text: "Log 3", processId: "process-1", timeStamp: 1623626600000 },
  ]

  for (const log of expectedLogs) {
    // deno-lint-ignore ban-types
    await (logger as unknown as Record<string, Function>)[log.severity](log.category, log.text, { id: log.processId }, log.timeStamp)
  }

  const logs = await logger.getLogContents()
  assertEquals(logs, expectedLogs)
})

test("Logger - getLogContents: Fetch logs by process ID", async () => {
  const logger = new Logger({}, await tempfile())
  await logger.init()

  const processId = "process-1"

  const expectedLogs: LogEventData[] = [
    { severity: "info", category: "test", text: "Log 1", processId, timeStamp: 1623626400000 },
    { severity: "error", category: "test", text: "Log 2", processId, timeStamp: 1623626500000 },
  ]

  for (const log of expectedLogs) {
    // deno-lint-ignore ban-types
    await (logger as unknown as Record<string, Function>)[log.severity](log.category, log.text, { id: log.processId }, log.timeStamp)
  }

  const logs = await logger.getLogContents(processId)
  assertEquals(logs, expectedLogs)
})

test("Logger - getLogContents: Fetch logs by time range", async () => {
  const logger = new Logger({}, await tempfile())
  await logger.init()

  const startTimeStamp = 1623626400000 // 2023-06-13T12:00:00.000Z
  const endTimeStamp = 1623626500000 // 2023-06-13T12:01:40.000Z

  const expectedLogs: LogEventData[] = [
    { severity: "info", category: "test", text: "Log 1", processId: "process-1", timeStamp: 1623626400000 },
    { severity: "warn", category: "test", text: "Log 2", processId: "process-2", timeStamp: 1623626450000 },
  ]

  for (const log of expectedLogs) {
    // deno-lint-ignore ban-types
    await (logger as unknown as Record<string, Function>)[log.severity](log.category, log.text, { id: log.processId }, log.timeStamp)
  }

  const logs = await logger.getLogContents(undefined, startTimeStamp, endTimeStamp)
  assertEquals(logs, expectedLogs)
})

test("Logger - getLogContents: Fetch logs by process ID and time range", async () => {
  const logger = new Logger({}, await tempfile())
  await logger.init()

  const processId = "process-1"
  const startTimeStamp = 1623626400000 // 2023-06-13T12:00:00.000Z
  const endTimeStamp = 1623626600000 // 2023-06-13T12:03:20.000Z

  const expectedLogs: LogEventData[] = [
    { severity: "info", category: "test", text: "Log 1", processId, timeStamp: 1623626400000 },
    { severity: "error", category: "test", text: "Log 2", processId, timeStamp: 1623626500000 },
  ]

  for (const log of expectedLogs) {
    // deno-lint-ignore ban-types
    await (logger as unknown as Record<string, Function>)[log.severity](log.category, log.text, { id: log.processId }, log.timeStamp)
  }

  const logs = await logger.getLogContents(processId, startTimeStamp, endTimeStamp)
  assertEquals(logs, expectedLogs)
})
