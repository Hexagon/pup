/*
 * Watchdog lifecycle tests
 *
 * @file test/core/watchdog.test.ts
 */

import type { Configuration } from "../../lib/core/configuration.ts"
import { ApiProcessState } from "@pup/api-definitions"
import { Pup } from "../../lib/core/pup.ts"
import { assertEquals } from "@std/assert"
import { test } from "@cross/test"
import { delay } from "@std/async"

test("Manual restart starts exactly one new instance when restartDelayMs is short", async () => {
  const TEST_PROCESS_ID = "test-restart-once"
  const config: Configuration = {
    processes: [{
      id: TEST_PROCESS_ID,
      cmd: 'deno eval "setInterval(() => {}, 1000)"',
      autostart: true,
      restartDelayMs: 0,
    }],
  }
  const pup = new Pup(config)

  let starts = 0
  // deno-lint-ignore no-explicit-any
  pup.events.on("process_status_changed", (ev: any) => {
    if (ev?.status?.id === TEST_PROCESS_ID && ev.new === ApiProcessState.STARTING) starts++
  })

  await pup.init()
  try {
    const testProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)!

    // Wait for autostart
    for (let i = 0; i < 100 && testProcess.getStatus().status !== ApiProcessState.RUNNING; i++) await delay(50)
    assertEquals(testProcess.getStatus().status, ApiProcessState.RUNNING)
    assertEquals(starts, 1)
    await delay(1000)

    // Request restart and let the watchdog act on it for a few ticks
    assertEquals(pup.restart(TEST_PROCESS_ID, "test"), true)
    await delay(3500)

    assertEquals(testProcess.getStatus().status, ApiProcessState.RUNNING)
    assertEquals(starts, 2)
  } finally {
    await pup.terminate(2500)
  }
})
