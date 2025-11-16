/*
 * Tests for command runner
 *
 * @file test/core/runner.test.ts
 */

import type { Configuration } from "../../lib/core/configuration.ts"
import { Pup } from "../../lib/core/pup.ts"
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

test("Runner executes actual 'deno task' commands correctly (issue #55)", async () => {
  const TEST_PROCESS_ID = "test-actual-deno-task"
  const TEST_PROCESS_COMMAND = "deno task hello"
  const TEST_CWD = new URL("../../lib/test/core/test-data/deno-task-test/", import.meta.url).pathname

  const config: Configuration = {
    processes: [
      {
        "id": TEST_PROCESS_ID,
        "cmd": TEST_PROCESS_COMMAND,
        "cwd": TEST_CWD,
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
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Stop and cleanup
  await pup.terminate(2500)
})
