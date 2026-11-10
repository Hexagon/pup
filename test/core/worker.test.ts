/*
 * Tests for processes running as web workers
 *
 * @file test/core/worker.test.ts
 */

import type { Configuration } from "../../lib/core/configuration.ts"
import { ApiProcessState } from "@pup/api-definitions"
import { Pup } from "../../lib/core/pup.ts"
import { assertEquals } from "@std/assert"
import { test } from "@cross/test"
import { delay } from "@std/async"

async function waitForStatus(pup: Pup, id: string, status: ApiProcessState, timeoutMs = 5000): Promise<boolean> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const p = pup.processes.findLast((p) => p.getConfig().id === id)
    if (p?.getStatus().status === status) return true
    await delay(50)
  }
  return false
}

test("Worker process can be stopped", async () => {
  const config: Configuration = {
    processes: [{ id: "test-worker-stop", worker: ["lib/test/core/test-data/test_worker.ts"] }],
  }
  const pup = new Pup(config)
  await pup.init()
  try {
    assertEquals(pup.start("test-worker-stop", "test"), true)
    assertEquals(await waitForStatus(pup, "test-worker-stop", ApiProcessState.RUNNING), true)

    // Stopping must resolve and leave the process in a finished state instead of hanging in STOPPING
    const stopResult = await Promise.race([pup.stop("test-worker-stop", "test"), delay(5000).then(() => "timeout")])
    assertEquals(stopResult, true)
    assertEquals(await waitForStatus(pup, "test-worker-stop", ApiProcessState.FINISHED), true)
  } finally {
    await pup.terminate(0)
  }
})

test("Worker process with uncaught error is reported as errored", async () => {
  const config: Configuration = {
    processes: [{ id: "test-worker-throw", worker: ["lib/test/core/test-data/test_worker_throw.ts"] }],
  }
  const pup = new Pup(config)
  await pup.init()
  try {
    assertEquals(pup.start("test-worker-throw", "test"), true)
    assertEquals(await waitForStatus(pup, "test-worker-throw", ApiProcessState.ERRORED), true)
  } finally {
    await pup.terminate(0)
  }
})
