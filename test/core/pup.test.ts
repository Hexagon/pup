/*
 * Various blackbox tests
 *
 * @file test/core/pup.test.ts
 */

import type { Configuration } from "../../lib/core/configuration.ts"
import { ApiProcessState } from "@pup/api-definitions"
import { Pup } from "../../lib/core/pup.ts"
import { assertEquals, assertNotEquals } from "@std/assert"
import { test } from "@cross/test"

test("Create test process. Test start, block, stop, start, unblock, start in sequence.", async () => {
  const TEST_PROCESS_ID = "test-1"
  const TEST_PROCESS_COMMAND = "deno run -A lib/test/core/test-data/test_process.ts"

  const config: Configuration = {
    processes: [
      {
        "id": TEST_PROCESS_ID,
        "cmd": TEST_PROCESS_COMMAND,
      },
    ],
  }
  const pup = new Pup(config)
  await pup.init()

  // Find process, assert existance
  const testProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assertNotEquals(testProcess, undefined)
  assertEquals(testProcess?.getStatus().status, ApiProcessState.CREATED)

  // Start process, assert started
  const startResult = pup.start(TEST_PROCESS_ID, "test")
  assertEquals(startResult, true)
  assertEquals(testProcess?.getStatus().status, ApiProcessState.STARTING)

  // Stop process, assert stopped
  const stopResult = await pup.stop(TEST_PROCESS_ID, "test")
  assertEquals(stopResult, true)
  assertEquals(testProcess?.getStatus().status, ApiProcessState.ERRORED)

  // Block process, assert blocked
  const blockResult = pup.block(TEST_PROCESS_ID, "test")
  assertEquals(blockResult, true)
  assertEquals(testProcess?.getStatus().blocked, true)

  // Start process, assert failed
  const startResult2 = pup.start(TEST_PROCESS_ID, "test")
  assertEquals(startResult2, false)
  assertEquals(testProcess?.getStatus().status, ApiProcessState.ERRORED)

  // Unblock process, assert unblocked
  const unblockResult = pup.unblock(TEST_PROCESS_ID, "test")
  assertEquals(unblockResult, true)
  assertEquals(testProcess?.getStatus().blocked, false)

  // Start process, assert started
  const startResult3 = pup.start(TEST_PROCESS_ID, "test")
  assertEquals(startResult3, true)
  assertEquals(testProcess?.getStatus().status, ApiProcessState.STARTING)

  // Terminate pup, allow 2.5 seconds for graceful shutdown
  await pup.terminate(2500)
})

test("Create test cluster. Test start, block, stop, start, unblock, start in sequence.", async () => {
  const TEST_PROCESS_ID = "test-2"
  const TEST_PROCESS_COMMAND = "deno run -A lib/test/core/test-data/test_process.ts"

  const config: Configuration = {
    processes: [
      {
        "id": TEST_PROCESS_ID,
        "cmd": TEST_PROCESS_COMMAND,
        "cluster": {
          "instances": 3,
        },
      },
    ],
  }
  const pup = new Pup(config)
  await pup.init()

  // Find process, assert existance
  const testProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assertNotEquals(testProcess, undefined)
  assertEquals(testProcess?.getStatus().status, ApiProcessState.CREATED)

  // Start process, assert started
  const startResult = pup.start(TEST_PROCESS_ID, "test")
  assertEquals(startResult, true)
  assertEquals(testProcess?.getStatus().status, ApiProcessState.STARTING)

  // Stop process, assert finished
  const stopResult = await pup.stop(TEST_PROCESS_ID, "test")
  assertEquals(stopResult, true)
  assertEquals(testProcess?.getStatus().status, ApiProcessState.ERRORED)

  // Block process, assert blocked
  const blockResult = pup.block(TEST_PROCESS_ID, "test")
  assertEquals(blockResult, true)
  assertEquals(testProcess?.getStatus().blocked, true)

  // Start process, assert failed
  const startResult2 = pup.start(TEST_PROCESS_ID, "test")
  assertEquals(startResult2, false)
  assertEquals(testProcess?.getStatus().status, ApiProcessState.ERRORED)

  // Unblock process, assert unblocked
  const unblockResult = pup.unblock(TEST_PROCESS_ID, "test")
  assertEquals(unblockResult, true)
  assertEquals(testProcess?.getStatus().blocked, false)

  // Start process, assert started
  const startResult3 = pup.start(TEST_PROCESS_ID, "test")
  assertEquals(startResult3, true)
  assertEquals(testProcess?.getStatus().status, ApiProcessState.STARTING)

  // Terminate pup, allow 2.5 seconds for graceful shutdown
  await pup.terminate(2500)
})
