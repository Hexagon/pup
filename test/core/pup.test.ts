/*
 * Various blackbox tests
 *
 * @file test/core/pup.test.ts
 */

import { Configuration } from "../../lib/core/configuration.ts"
import { ProcessState } from "../../lib/core/process.ts"
import { Pup } from "../../lib/core/pup.ts"
import { assertEquals, assertNotEquals } from "../deps.ts"

Deno.test({
  name: "Create test process. Test start, block, stop, start, unblock, start in sequence.",
  sanitizeExit: false,
  fn: async () => {
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
    assertEquals(testProcess?.getStatus().status, ProcessState.CREATED)

    // Start process, assert started
    const startResult = pup.start(TEST_PROCESS_ID, "test")
    assertEquals(startResult, true)
    assertEquals(testProcess?.getStatus().status, ProcessState.RUNNING)

    // Stop process, assert stopped
    const stopResult = await pup.stop(TEST_PROCESS_ID, "test")
    assertEquals(stopResult, true)
    assertEquals(testProcess?.getStatus().status, ProcessState.FINISHED)

    // Block process, assert blocked
    const blockResult = pup.block(TEST_PROCESS_ID, "test")
    assertEquals(blockResult, true)
    assertEquals(testProcess?.getStatus().blocked, true)

    // Start process, assert failed
    const startResult2 = pup.start(TEST_PROCESS_ID, "test")
    assertEquals(startResult2, false)
    assertEquals(testProcess?.getStatus().status, ProcessState.FINISHED)

    // Unblock process, assert unblocked
    const unblockResult = pup.unblock(TEST_PROCESS_ID, "test")
    assertEquals(unblockResult, true)
    assertEquals(testProcess?.getStatus().blocked, false)

    // Start process, assert started
    const startResult3 = pup.start(TEST_PROCESS_ID, "test")
    assertEquals(startResult3, true)
    assertEquals(testProcess?.getStatus().status, ProcessState.RUNNING)

    // Terminate pup instantly
    await pup.terminate(0)
  },
})

Deno.test({
  name: "Create test cluster. Test start, block, stop, start, unblock, start in sequence.",
  sanitizeExit: false,
  fn: async () => {
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
    assertEquals(testProcess?.getStatus().status, ProcessState.CREATED)

    // Start process, assert started
    const startResult = pup.start(TEST_PROCESS_ID, "test")
    assertEquals(startResult, true)
    assertEquals(testProcess?.getStatus().status, ProcessState.RUNNING)

    // Stop process, assert finished
    const stopResult = await pup.stop(TEST_PROCESS_ID, "test")
    assertEquals(stopResult, true)
    assertEquals(testProcess?.getStatus().status, ProcessState.FINISHED)

    // Block process, assert blocked
    const blockResult = pup.block(TEST_PROCESS_ID, "test")
    assertEquals(blockResult, true)
    assertEquals(testProcess?.getStatus().blocked, true)

    // Start process, assert failed
    const startResult2 = pup.start(TEST_PROCESS_ID, "test")
    assertEquals(startResult2, false)
    assertEquals(testProcess?.getStatus().status, ProcessState.FINISHED)

    // Unblock process, assert unblocked
    const unblockResult = pup.unblock(TEST_PROCESS_ID, "test")
    assertEquals(unblockResult, true)
    assertEquals(testProcess?.getStatus().blocked, false)

    // Start process, assert started
    const startResult3 = pup.start(TEST_PROCESS_ID, "test")
    assertEquals(startResult3, true)
    assertEquals(testProcess?.getStatus().status, ProcessState.RUNNING)

    // Terminate pup instantly
    await pup.terminate(0)
  },
})
