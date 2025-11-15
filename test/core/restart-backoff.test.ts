/*
 * Test exponential backoff for process restarts
 *
 * @file test/core/restart-backoff.test.ts
 */

import type { Configuration } from "../../lib/core/configuration.ts"
import { ApiProcessState } from "@pup/api-definitions"
import { Pup } from "../../lib/core/pup.ts"
import { assertEquals, assertGreaterOrEqual, assertLessOrEqual } from "@std/assert"
import { test } from "@cross/test"

test("Process restart with exponential backoff", async () => {
  const TEST_PROCESS_ID = "restart-backoff-test"
  // Command that exits immediately with error
  const TEST_PROCESS_COMMAND = "deno eval 'Deno.exit(1)'"

  const config: Configuration = {
    processes: [
      {
        "id": TEST_PROCESS_ID,
        "cmd": TEST_PROCESS_COMMAND,
        "restart": "error",
        "restartDelayMs": 100, // 100ms base delay
        "restartBackoffMs": 1000, // Cap at 1 second
        "restartLimit": 5,
      },
    ],
  }
  const pup = new Pup(config)
  await pup.init()

  // Find process
  const testProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assertEquals(testProcess !== undefined, true)

  // Start process
  pup.start(TEST_PROCESS_ID, "test")

  // Wait for first failure
  await new Promise((resolve) => setTimeout(resolve, 200))

  let status = testProcess!.getStatus()
  assertEquals(status.status, ApiProcessState.ERRORED)
  assertEquals(status.restarts, 0) // First run, no restarts yet

  // Wait for first restart (should happen quickly with 100ms base delay)
  await new Promise((resolve) => setTimeout(resolve, 200))

  status = testProcess!.getStatus()
  assertGreaterOrEqual(status.restarts || 0, 1) // At least one restart

  // Wait for potential second restart (should take ~200ms with exponential backoff)
  await new Promise((resolve) => setTimeout(resolve, 350))

  status = testProcess!.getStatus()
  assertGreaterOrEqual(status.restarts || 0, 2) // At least two restarts

  // Wait for potential third restart (should take ~400ms with exponential backoff)
  await new Promise((resolve) => setTimeout(resolve, 550))

  status = testProcess!.getStatus()
  assertGreaterOrEqual(status.restarts || 0, 3) // At least three restarts

  // Verify that restarts are limited by restartLimit
  await new Promise((resolve) => setTimeout(resolve, 2000))

  status = testProcess!.getStatus()
  assertLessOrEqual(status.restarts || 0, 5) // Should not exceed restartLimit

  // If limit reached, status should be EXHAUSTED
  if (status.restarts === 5) {
    assertEquals(status.status, ApiProcessState.EXHAUSTED)
  }

  // Terminate pup
  await pup.terminate(500)
})

test("Process restart without backoff (default behavior)", async () => {
  const TEST_PROCESS_ID = "restart-no-backoff-test"
  // Command that exits immediately with error
  const TEST_PROCESS_COMMAND = "deno eval 'Deno.exit(1)'"

  const config: Configuration = {
    processes: [
      {
        "id": TEST_PROCESS_ID,
        "cmd": TEST_PROCESS_COMMAND,
        "restart": "error",
        "restartDelayMs": 100, // 100ms fixed delay
        // No restartBackoffMs - should use fixed delay
        "restartLimit": 3,
      },
    ],
  }
  const pup = new Pup(config)
  await pup.init()

  // Find process
  const testProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assertEquals(testProcess !== undefined, true)

  // Start process
  pup.start(TEST_PROCESS_ID, "test")

  // Wait for first failure and restart
  await new Promise((resolve) => setTimeout(resolve, 250))

  let status = testProcess!.getStatus()
  assertGreaterOrEqual(status.restarts || 0, 1)

  // With fixed 100ms delay, we should get more restarts in the same time
  // compared to exponential backoff
  await new Promise((resolve) => setTimeout(resolve, 400))

  status = testProcess!.getStatus()
  assertGreaterOrEqual(status.restarts || 0, 2)

  // Terminate pup
  await pup.terminate(500)
})
