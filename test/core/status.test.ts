import { Status } from "../../lib/core/status.ts"
import { assertEquals } from "@std/assert"
import { test } from "@cross/test"

const TEST_FILE_PATH = "./test_data_Status.jsontest"

test("Status - Should create an instance with statusFileName property if provided", () => {
  const expectedFileName = TEST_FILE_PATH
  const status = new Status(expectedFileName)
  assertEquals(status["storeName"], expectedFileName)
})

test("Status - Should not have statusFileName property if not provided", () => {
  const status = new Status()
  assertEquals(status["storeName"], undefined)
})
