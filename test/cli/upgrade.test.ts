/*
 * Tests for the version inventory used by `pup upgrade`
 *
 * @file test/cli/upgrade.test.ts
 */

import { getVersions } from "../../lib/cli/upgrade.ts"
import { assertEquals, assertRejects } from "@std/assert"
import { test } from "@cross/test"

const INVENTORY = {
  canary_url: "https://example.invalid/pup.ts",
  stable: [{ version: "1.0.4", url: "jsr:@pup/pup@1.0.4", deno: "2.0.0", deno_unstable: "2.0.0", default_permissions: [] }],
  prerelease: [{ version: "1.0.5-dev.0", url: "jsr:@pup/pup@1.0.5-dev.0", deno: "2.0.0", deno_unstable: "2.0.0", default_permissions: [] }],
}

async function withServer(handler: (req: Request) => Response, fn: (base: string) => Promise<void>) {
  const ac = new AbortController()
  const server = Deno.serve({ port: 0, hostname: "127.0.0.1", signal: ac.signal, onListen: () => {} }, handler)
  try {
    await fn(`http://127.0.0.1:${server.addr.port}`)
  } finally {
    ac.abort()
    await server.finished
  }
}

test("Version inventory falls back to the next source when one fails", async () => {
  await withServer((req) => {
    const path = new URL(req.url).pathname
    if (path === "/broken") return new Response("not found", { status: 404 })
    if (path === "/invalid") return Response.json({ hello: "world" })
    return Response.json(INVENTORY)
  }, async (base) => {
    const versions = await getVersions(false, [`${base}/broken`, `${base}/invalid`, `${base}/ok`])
    assertEquals(versions.prerelease[0].version, "1.0.5-dev.0")
  })
})

test("Version inventory reports all sources when every one fails", async () => {
  await withServer(() => new Response("nope", { status: 500 }), async (base) => {
    await assertRejects(() => getVersions(false, [`${base}/a`, `${base}/b`]), Error, `${base}/b: HTTP 500`)
  })
})
