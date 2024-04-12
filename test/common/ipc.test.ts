import { assertEquals } from "@std/assert"
import { FileIPC } from "../../lib/common/ipc.ts"
import { exists } from "@cross/fs"
import { test } from "@cross/test"

const TEST_FILE_PATH = "./test_data_FileIPC.ipctest"
const TEST_STALE_LIMIT = 2000

test("FileIPC - sendData writes data to file", async () => {
  const fileIPC = new FileIPC(TEST_FILE_PATH)
  await fileIPC.sendData("test data")
  const fileExistsResult = await exists(TEST_FILE_PATH)
  assertEquals(fileExistsResult, true)
  await fileIPC.close()
})

test("FileIPC - receiveData returns an array of ValidatedMessages", async () => {
  const fileIPC = new FileIPC(TEST_FILE_PATH)
  await fileIPC.sendData("test data")
  for await (const receivedMessages of fileIPC.receiveData()) {
    assertEquals(receivedMessages.length, 1)
    assertEquals(receivedMessages[0].pid, Deno.pid)
    assertEquals(receivedMessages[0].data, "test data")
    assertEquals(receivedMessages[0].errors.length, 0)
    await fileIPC.close()
  }
})

test("FileIPC - receiveData removes stale messages", async () => {
  const fileIPC = new FileIPC(TEST_FILE_PATH, TEST_STALE_LIMIT)
  await fileIPC.sendData("test data 1")
  await new Promise((resolve) => setTimeout(resolve, TEST_STALE_LIMIT + 100))
  await fileIPC.sendData("test data 2")
  for await (const receivedMessages of fileIPC.receiveData()) {
    assertEquals(receivedMessages.length, 2)
    assertEquals(receivedMessages[0].pid, Deno.pid)
    assertEquals(receivedMessages[0].data, null)
    assertEquals(receivedMessages[0].errors.length, 1)
    assertEquals(receivedMessages[0].errors[0], "Invalid data received: stale")
    assertEquals(receivedMessages[1].pid, Deno.pid)
    assertEquals(receivedMessages[1].data, "test data 2")
    assertEquals(receivedMessages[1].errors.length, 0)
    await fileIPC.close()
  }
})

test("FileIPC - receiveData handles invalid messages", async () => {
  const fileIPC = new FileIPC(TEST_FILE_PATH)
  await fileIPC.sendData("test data")
  await fileIPC.sendData("a".repeat(fileIPC.MAX_DATA_LENGTH + 1))
  for await (const receivedMessages of fileIPC.receiveData()) {
    assertEquals(receivedMessages.length, 2)
    assertEquals(receivedMessages[0].pid, Deno.pid)
    assertEquals(receivedMessages[0].data, "test data")
    assertEquals(receivedMessages[0].errors.length, 0)
    assertEquals(receivedMessages[1].pid, Deno.pid)
    assertEquals(receivedMessages[1].data, null)
    assertEquals(receivedMessages[1].errors.length, 1)
    assertEquals(receivedMessages[1].errors[0], "Invalid data received: too long")
    await fileIPC.close()
  }
})

test("FileIPC - close removes IPC file", async () => {
  const fileIPC = new FileIPC(TEST_FILE_PATH)
  await fileIPC.sendData("test data")
  await fileIPC.close()
  const fileExistsResult = await exists(TEST_FILE_PATH)
  assertEquals(fileExistsResult, false)
})

test("FileIPC - close leaves IPC file when leaveFile option is true", async () => {
  const fileIPC = new FileIPC(TEST_FILE_PATH)
  await fileIPC.sendData("test data")
  await fileIPC.close(true)
  const fileExistsResult = await exists(TEST_FILE_PATH)
  assertEquals(fileExistsResult, true)
  await Deno.remove(TEST_FILE_PATH)
})

test("FileIPC - close leaves IPC file when leaveFile option is true", async () => {
  const fileIPC = new FileIPC(TEST_FILE_PATH)
  await fileIPC.sendData("test data")
  await fileIPC.close(true)
  const fileExistsResult = await exists(TEST_FILE_PATH)
  assertEquals(fileExistsResult, true)
  await Deno.remove(TEST_FILE_PATH)
})

test("FileIPC - close leaves IPC file when leaveFile option is true", async () => {
  const fileIPC = new FileIPC(TEST_FILE_PATH)
  await fileIPC.sendData("test data")
  await fileIPC.close(true)
  const fileExistsResult = await exists(TEST_FILE_PATH)
  assertEquals(fileExistsResult, true)
  await Deno.remove(TEST_FILE_PATH)
})
