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
        "restartBackoffMs": 2000, // Cap at 2 seconds
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

  // Wait for first failure (process exits immediately)
  await new Promise((resolve) => setTimeout(resolve, 500))

  let status = testProcess!.getStatus()
  assertEquals(status.status, ApiProcessState.ERRORED)
  assertEquals(status.restarts, 0) // First run, no restarts yet

  // Wait for first restart
  // Watchdog runs every 1s, then waits for restartDelay (100ms)
  await new Promise((resolve) => setTimeout(resolve, 1500))

  status = testProcess!.getStatus()
  assertGreaterOrEqual(status.restarts || 0, 1) // At least one restart

  // Wait for potential second restart
  // Watchdog 1s + exponential backoff delay (200ms for 2nd restart)
  await new Promise((resolve) => setTimeout(resolve, 1500))

  status = testProcess!.getStatus()
  assertGreaterOrEqual(status.restarts || 0, 2) // At least two restarts

  // Wait for potential third restart
  // Watchdog 1s + exponential backoff delay (400ms for 3rd restart)
  await new Promise((resolve) => setTimeout(resolve, 1500))

  status = testProcess!.getStatus()
  assertGreaterOrEqual(status.restarts || 0, 3) // At least three restarts

  // Verify that restarts are limited by restartLimit
  await new Promise((resolve) => setTimeout(resolve, 3000))

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
  // Watchdog runs every 1s, then waits for restartDelay (100ms)
  await new Promise((resolve) => setTimeout(resolve, 1500))

  let status = testProcess!.getStatus()
  assertGreaterOrEqual(status.restarts || 0, 1)

  // With fixed 100ms delay, should get second restart after another 1.1s
  await new Promise((resolve) => setTimeout(resolve, 1500))

  status = testProcess!.getStatus()
  assertGreaterOrEqual(status.restarts || 0, 2)

  // Terminate pup
  await pup.terminate(500)
})
