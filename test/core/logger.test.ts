import { assertEquals, assertGreater } from "@std/assert"
import { type AttachedLogger, type LogEventData, Logger } from "../../lib/core/logger.ts"
import type { ProcessConfiguration } from "../../mod.ts"
import { test } from "@cross/test"

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

test("Logger - Attachment of External Logger", () => {
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

test("Logger - Logging with Different Methods", () => {
  const logger = new Logger({ console: false })

  logger.log("test", "Testing log method")
  logger.info("test", "Testing info method")
  logger.warn("test", "Testing warn method")
  logger.error("test", "Testing error method")

  assertEquals(true, true) // This is just to assert that the test passed if no errors are thrown
})

test("Logger - Logging Line Larger than KV Limit", async () => {
  const tempStore = Deno.makeTempFileSync()
  const logger = new Logger({ console: false }, tempStore)

  let chars = 60000
  let data = ""
  while (chars--) {
    data += "國"
  }
  await logger.log("test", data)
  assertGreater(Deno.statSync(tempStore).size, 200_000)

  chars = 70000
  data = ""
  while (chars--) {
    data += "a"
  }
  await logger.log("test", data)
  assertGreater(Deno.statSync(tempStore).size, 400_000)

  chars = 50000
  data = ""
  while (chars--) {
    data += "👨‍👩‍👧‍👦"
  }
  await logger.log("test", data)
  assertGreater(Deno.statSync(tempStore).size, 2_000_000)

  await Deno.remove(tempStore)
})

test("Logger - File Writing with writeFile Method", async () => {
  const logger = new Logger({ console: false })
  const testFileName = "test_writeFile.log"
  const testText = "Testing writeFile"
  await logger["writeFile"](testFileName, testText)

  const fileContent = await Deno.readTextFile(testFileName)
  assertEquals(fileContent, `${testText}\n`)

  await Deno.remove(testFileName)
})

test("Logger - getLogContents: Fetch all logs", async () => {
  const tempStore = await Deno.makeTempDir() + "/.store"
  const logger = new Logger({}, tempStore)

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
  const tempStore = await Deno.makeTempDir() + "/.store"
  const logger = new Logger({}, tempStore)

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
  const tempStore = await Deno.makeTempDir() + "/.store"
  const logger = new Logger({}, tempStore)

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
  const tempStore = await Deno.makeTempDir() + "/.store"
  const logger = new Logger({}, tempStore)

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
