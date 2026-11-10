/*
 * File watcher tests
 *
 * @file test/core/watcher.test.ts
 */

import type { Configuration } from "../../lib/core/configuration.ts"
import { Pup } from "../../lib/core/pup.ts"
import { Watcher } from "../../lib/core/watcher.ts"
import { assert, assertEquals, assertNotEquals } from "@std/assert"
import { test } from "@cross/test"
import { delay } from "@std/async"

test("Watcher iteration ends when stopped", async () => {
  const watcher = new Watcher({ paths: ["lib/test"] })
  const iteration = (async () => {
    for await (const _ of watcher) { /* consume */ }
    return "ended"
  })()
  await delay(100)
  watcher.stop()
  const result = await Promise.race([iteration, delay(2000).then(() => "timeout")])
  assertEquals(result, "ended")
  // Let the internal polling loop wind down
  await delay(500)
})

test("Previous file watcher is stopped when a crashed watched process is restarted", async () => {
  const TEST_PROCESS_ID = "test-watch-crash"
  const config: Configuration = {
    processes: [{
      id: TEST_PROCESS_ID,
      cmd: 'deno eval "setTimeout(() => Deno.exit(1), 200)"',
      watch: ["lib/test"],
      autostart: true,
      restartDelayMs: 0,
    }],
  }
  const pup = new Pup(config)
  await pup.init()
  try {
    const testProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)!

    // Wait for the first watcher
    for (let i = 0; i < 100 && !testProcess["watcher"]; i++) await delay(50)
    const firstWatcher = testProcess["watcher"]
    assertNotEquals(firstWatcher, undefined)

    // Wait for the crash + automatic restart, which creates a new watcher
    for (let i = 0; i < 100 && testProcess["watcher"] === firstWatcher; i++) await delay(50)
    assertNotEquals(testProcess["watcher"], firstWatcher)
    assert(firstWatcher!["stopWatching"], "Previous watcher should have been stopped")
  } finally {
    await pup.terminate(2500)
    await delay(500)
  }
})
