/*
 * REST API tests
 *
 * @file test/core/rest.test.ts
 */

import type { Configuration } from "../../lib/core/configuration.ts"
import { Pup } from "../../lib/core/pup.ts"
import { RestApi } from "../../lib/core/rest.ts"
import { GenerateToken } from "../../lib/common/token.ts"
import { findFreePort } from "../../lib/core/port.ts"
import { assertEquals } from "@std/assert"
import { test } from "@cross/test"
import { delay } from "@std/async"

const SECRET = "test-secret-for-rest-api-tests-only-".padEnd(64, "x")

test("REST API reports failed process actions with a non-OK status", async () => {
  const config: Configuration = {
    processes: [{ id: "rest-test-process", cmd: 'deno eval "setInterval(() => {}, 1000)"' }],
  }
  const pup = new Pup(config)
  await pup.init()

  const port = await findFreePort()
  const api = new RestApi(pup, "127.0.0.1", port, SECRET)
  api.start()
  const token = await GenerateToken(SECRET, { consumer: "test" }, Date.now() + 60_000)
  const headers = { Authorization: `Bearer ${token}` }
  await delay(200)

  try {
    const post = async (path: string) => {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers: { ...headers, Connection: "close" } })
      const body = await res.text()
      return { status: res.status, body: body ? JSON.parse(body) : undefined }
    }

    // Unknown process id must not be reported as success
    for (const action of ["start", "stop", "restart", "block", "unblock"]) {
      const res = await post(`/processes/does-not-exist/${action}`)
      assertEquals(res.status, 500, `${action} on unknown process should fail`)
      assertEquals(res.body.error, "Action could not be carried out, check the arguments.")
    }

    // Stopping a process that is not running must fail
    assertEquals((await post("/processes/rest-test-process/stop")).status, 500)

    // Starting a blocked process must fail
    assertEquals((await post("/processes/rest-test-process/block")).status, 200)
    assertEquals((await post("/processes/rest-test-process/start")).status, 500)
    assertEquals((await post("/processes/rest-test-process/unblock")).status, 200)
  } finally {
    api.terminate()
    await pup.terminate(0)
  }
})
