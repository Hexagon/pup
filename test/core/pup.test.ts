/*
 * Various blackbox tests
 *
 * @file test/core/pup.test.ts
 */

import type { Configuration } from "../../lib/core/configuration.ts"
import { ApiProcessState } from "@pup/api-definitions"
import { Pup } from "../../lib/core/pup.ts"
import { Cluster } from "../../lib/core/cluster.ts"
import { assert, assertEquals, assertNotEquals } from "@std/assert"
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

test("Create cluster with startPort but no commonPort. Verify PUP_CLUSTER_PORT is set for each instance.", async () => {
  const TEST_PROCESS_ID = "test-3"
  const TEST_PROCESS_COMMAND = "deno run -A lib/test/core/test-data/test_process.ts"
  const START_PORT = 9000

  const config: Configuration = {
    processes: [
      {
        "id": TEST_PROCESS_ID,
        "cmd": TEST_PROCESS_COMMAND,
        "cluster": {
          "instances": 2,
          "startPort": START_PORT,
        },
      },
    ],
  }
  const pup = new Pup(config)
  await pup.init()

  // Find the cluster process
  const testCluster = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assertNotEquals(testCluster, undefined)
  assertEquals(testCluster instanceof Cluster, true)

  const cluster = testCluster as Cluster

  // Each sub-process should have PUP_CLUSTER_PORT set to startPort + index
  assertEquals(cluster.processes.length, 2)
  assertEquals(cluster.processes[0].getConfig().env?.PUP_CLUSTER_PORT, String(START_PORT))
  assertEquals(cluster.processes[1].getConfig().env?.PUP_CLUSTER_PORT, String(START_PORT + 1))
  const testProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assert(testProcess instanceof Cluster)

  const [instance0, instance1] = testProcess.processes
  assertEquals(instance0.getConfig().env?.PUP_CLUSTER_INSTANCE, "0")
  assertEquals(instance0.getConfig().env?.PUP_CLUSTER_PORT, "8000")
  assertEquals(instance1.getConfig().env?.PUP_CLUSTER_INSTANCE, "1")
  assertEquals(instance1.getConfig().env?.PUP_CLUSTER_PORT, "8001")

  await pup.terminate(2500)
})
