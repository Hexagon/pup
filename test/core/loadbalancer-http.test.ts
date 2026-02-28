// Test HTTP load balancer with X-Forwarded-For forwarding
import { assertEquals } from "@std/assert"
import { type Backend, BalancingStrategy, LoadBalancer, LoadBalancerType } from "../../lib/core/loadbalancer.ts"
import { test } from "@cross/test"

const loggerCallback = (severity: string, category: string, text: string) => {
  console.log(`[${severity.toUpperCase()}][${category}] ${text}`)
}

test("LoadBalancer HTTP - X-Forwarded-For header is added", async () => {
  // Create a simple backend HTTP server that echoes headers
  const backendPort = 8095

  const backendServer = Deno.serve({
    port: backendPort,
    hostname: "127.0.0.1",
    handler: (req) => {
      return new Response(
        JSON.stringify({
          forwardedFor: req.headers.get("X-Forwarded-For"),
          realIp: req.headers.get("X-Real-IP"),
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      )
    },
  })

  // Give the backend server time to start
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Create HTTP load balancer
  const lbPort = 8096
  const backends: Backend[] = [{ host: "127.0.0.1", port: backendPort }]
  const loadBalancer = new LoadBalancer(
    backends,
    BalancingStrategy.ROUND_ROBIN,
    120,
    loggerCallback,
    LoadBalancerType.HTTP,
  )

  // Start load balancer in background
  loadBalancer.start(lbPort)

  // Give the load balancer time to start
  await new Promise((resolve) => setTimeout(resolve, 100))

  try {
    // Make a request through the load balancer
    const response = await fetch(`http://127.0.0.1:${lbPort}/test`, {
      headers: {
        "User-Agent": "test-client",
      },
    })

    assertEquals(response.status, 200)

    const body = await response.json()

    // Verify X-Forwarded-For header was added
    assertEquals(typeof body.forwardedFor, "string")
    assertEquals(body.forwardedFor.includes("127.0.0.1"), true)

    // Verify X-Real-IP header was added
    assertEquals(typeof body.realIp, "string")
    assertEquals(body.realIp, "127.0.0.1")

    console.log("Headers received by backend:", {
      forwardedFor: body.forwardedFor,
      realIp: body.realIp,
    })
  } finally {
    // Cleanup
    loadBalancer.close()
    await backendServer.shutdown()
  }
})

test("LoadBalancer HTTP - X-Forwarded-For header is appended to existing header", async () => {
  // Create a simple backend HTTP server that echoes headers
  const backendPort = 8097

  const backendServer = Deno.serve({
    port: backendPort,
    hostname: "127.0.0.1",
    handler: (req) => {
      return new Response(
        JSON.stringify({
          forwardedFor: req.headers.get("X-Forwarded-For"),
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      )
    },
  })

  // Give the backend server time to start
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Create HTTP load balancer
  const lbPort = 8098
  const backends: Backend[] = [{ host: "127.0.0.1", port: backendPort }]
  const loadBalancer = new LoadBalancer(
    backends,
    BalancingStrategy.ROUND_ROBIN,
    120,
    loggerCallback,
    LoadBalancerType.HTTP,
  )

  // Start load balancer in background
  loadBalancer.start(lbPort)

  // Give the load balancer time to start
  await new Promise((resolve) => setTimeout(resolve, 100))

  try {
    // Make a request through the load balancer with an existing X-Forwarded-For header
    const response = await fetch(`http://127.0.0.1:${lbPort}/test`, {
      headers: {
        "X-Forwarded-For": "192.168.1.100",
      },
    })

    assertEquals(response.status, 200)

    const body = await response.json()

    // Verify X-Forwarded-For header contains both the original and the new IP
    assertEquals(typeof body.forwardedFor, "string")
    assertEquals(body.forwardedFor.includes("192.168.1.100"), true)
    assertEquals(body.forwardedFor.includes("127.0.0.1"), true)
    assertEquals(body.forwardedFor.includes(","), true) // Should have comma separator

    console.log("Appended X-Forwarded-For:", body.forwardedFor)
  } finally {
    // Cleanup
    loadBalancer.close()
    await backendServer.shutdown()
  }
})
