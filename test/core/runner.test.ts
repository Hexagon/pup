/*
 * Tests for command runner
 *
 * @file test/core/runner.test.ts
 */

import type { Configuration } from "../../lib/core/configuration.ts"
import { Pup } from "../../lib/core/pup.ts"
import { Runner } from "../../lib/core/runner.ts"
import { delay } from "@std/async"
import { assertEquals } from "@std/assert"
import { test } from "@cross/test"

test("Runner properly handles multi-word commands like 'deno task'", async () => {
  const TEST_PROCESS_ID = "test-deno-task"
  // Use deno eval to verify arguments are passed correctly
  const TEST_PROCESS_COMMAND = 'deno eval "console.log(\\"hello-from-task\\")"'

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

  // Find process
  const testProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assertEquals(testProcess !== undefined, true)

  // Start process
  const startResult = pup.start(TEST_PROCESS_ID, "test")
  assertEquals(startResult, true)

  // Wait a moment for process to complete
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Stop and cleanup
  await pup.terminate(2500)
})

test("Runner handles commands with pipes and redirects", async () => {
  const TEST_PROCESS_ID = "test-pipe-command"
  // Echo something and pipe it through a command
  const TEST_PROCESS_COMMAND = 'echo "test" | deno eval "const decoder = new TextDecoder(); for await (const chunk of Deno.stdin.readable) { console.log(decoder.decode(chunk).trim()); }"'

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

  // Find process
  const testProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assertEquals(testProcess !== undefined, true)

  // Start process
  const startResult = pup.start(TEST_PROCESS_ID, "test")
  assertEquals(startResult, true)

  // Wait a moment for process to complete
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Stop and cleanup
  await pup.terminate(2500)
})

test("Runner honours a kill requested before the command is spawned", async () => {
  const config: Configuration = {
    processes: [{ id: "test-early-kill", cmd: 'deno eval "setInterval(() => {}, 1000)"' }],
  }
  const pup = new Pup(config)
  await pup.init()
  try {
    const runner = new Runner(pup, config.processes[0])
    let spawned = false
    // run() is still preparing the environment when kill() is called
    const running = runner.run(() => spawned = true)
    runner.kill("SIGTERM")
    const result = await Promise.race([running, delay(5000).then(() => undefined)])
    assertEquals(result?.code, 124)
    assertEquals(spawned, false)
  } finally {
    await pup.terminate(0)
  }
})
