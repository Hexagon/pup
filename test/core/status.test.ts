import { Status } from "../../lib/core/status.ts"
import { assertEquals } from "../deps.ts"

const TEST_FILE_PATH = "./test_data_Status.jsontest"

Deno.test("Status - Should create an instance with statusFileName property if provided", () => {
  const expectedFileName = TEST_FILE_PATH
  const status = new Status(expectedFileName)
  assertEquals(status["storeName"], expectedFileName)
})

Deno.test("Status - Should not have statusFileName property if not provided", () => {
  const status = new Status()
  assertEquals(status["storeName"], undefined)
})
