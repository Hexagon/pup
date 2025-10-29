/*
 * Cluster configuration tests
 *
 * @file test/core/cluster.test.ts
 */

import type { Configuration } from "../../lib/core/configuration.ts"
import { Pup } from "../../lib/core/pup.ts"
import { Cluster } from "../../lib/core/cluster.ts"
import { assertEquals, assertExists } from "@std/assert"
import { test } from "@cross/test"

test("Cluster with startPort but without commonPort should set PUP_CLUSTER_PORT", async () => {
  const TEST_PROCESS_ID = "cluster-no-lb"
  const TEST_PROCESS_COMMAND = "deno run -A test/core/test-data/test_process.ts"

  const config: Configuration = {
    processes: [
      {
        "id": TEST_PROCESS_ID,
        "cmd": TEST_PROCESS_COMMAND,
        "cluster": {
          "instances": 3,
          "startPort": 8000,
          // commonPort is intentionally omitted to test external load balancer scenario
        },
      },
    ],
  }
  const pup = new Pup(config)
  await pup.init()

  // Find cluster process
  const clusterProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assertExists(clusterProcess)

  // Verify it's a cluster
  assertEquals(clusterProcess.isCluster(), true)

  // Get all child processes
  const cluster = clusterProcess as Cluster
  assertEquals(cluster.processes.length, 3)

  // Verify each instance has the correct PUP_CLUSTER_PORT set
  for (let i = 0; i < 3; i++) {
    const childProcess = cluster.processes[i]
    const config = childProcess.getConfig()

    // Check that PUP_CLUSTER_INSTANCE is set
    assertEquals(config.env.PUP_CLUSTER_INSTANCE, i.toString())

    // Check that PUP_CLUSTER_PORT is set correctly
    assertEquals(config.env.PUP_CLUSTER_PORT, (8000 + i).toString())
  }

  // Terminate pup
  await pup.terminate(1000)
})

test("Cluster with both commonPort and startPort should set PUP_CLUSTER_PORT", async () => {
  const TEST_PROCESS_ID = "cluster-with-lb"
  const TEST_PROCESS_COMMAND = "deno run -A test/core/test-data/test_process.ts"

  const config: Configuration = {
    processes: [
      {
        "id": TEST_PROCESS_ID,
        "cmd": TEST_PROCESS_COMMAND,
        "cluster": {
          "instances": 2,
          "startPort": 9000,
          "commonPort": 3000, // Built-in load balancer enabled
        },
      },
    ],
  }
  const pup = new Pup(config)
  await pup.init()

  // Find cluster process
  const clusterProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assertExists(clusterProcess)

  // Get all child processes
  const cluster = clusterProcess as Cluster
  assertEquals(cluster.processes.length, 2)

  // Verify each instance has the correct PUP_CLUSTER_PORT set
  for (let i = 0; i < 2; i++) {
    const childProcess = cluster.processes[i]
    const config = childProcess.getConfig()

    assertEquals(config.env.PUP_CLUSTER_INSTANCE, i.toString())
    assertEquals(config.env.PUP_CLUSTER_PORT, (9000 + i).toString())
  }

  // Terminate pup
  await pup.terminate(1000)
})

test("Cluster without startPort should not set PUP_CLUSTER_PORT", async () => {
  const TEST_PROCESS_ID = "cluster-no-port"
  const TEST_PROCESS_COMMAND = "deno run -A test/core/test-data/test_process.ts"

  const config: Configuration = {
    processes: [
      {
        "id": TEST_PROCESS_ID,
        "cmd": TEST_PROCESS_COMMAND,
        "cluster": {
          "instances": 2,
          // No startPort defined - worker processes that don't listen on ports
        },
      },
    ],
  }
  const pup = new Pup(config)
  await pup.init()

  // Find cluster process
  const clusterProcess = pup.processes.findLast((p) => p.getConfig().id === TEST_PROCESS_ID)
  assertExists(clusterProcess)

  // Get all child processes
  const cluster = clusterProcess as Cluster
  assertEquals(cluster.processes.length, 2)

  // Verify PUP_CLUSTER_PORT is not set, but PUP_CLUSTER_INSTANCE is
  for (let i = 0; i < 2; i++) {
    const childProcess = cluster.processes[i]
    const config = childProcess.getConfig()

    assertEquals(config.env.PUP_CLUSTER_INSTANCE, i.toString())
    assertEquals(config.env.PUP_CLUSTER_PORT, undefined)
  }

  // Terminate pup
  await pup.terminate(1000)
})
