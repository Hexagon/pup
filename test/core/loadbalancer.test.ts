// load_balancer_test.ts
import { assertEquals, assertRejects } from "../deps.ts"
import { Backend, BalancingStrategy, hashCode, LoadBalancer } from "../../lib/core/loadbalancer.ts"

Deno.test("LoadBalancer initialization", () => {
  const backends: Backend[] = [
    { host: "backend1.example.com", port: 80 },
    { host: "backend2.example.com", port: 80 },
  ]
  const loadBalancer = new LoadBalancer(backends)
  assertEquals(loadBalancer instanceof LoadBalancer, true)
})

Deno.test("LoadBalancer throws error when no backends are provided", async () => {
  const backends: Backend[] = []
  const loadBalancer = new LoadBalancer(backends)
  await assertRejects(() => {
    return loadBalancer.start(3000)
  })
})

Deno.test("hashCode should return a unique value for different strings", () => {
  const hash1 = hashCode("hello world")
  const hash2 = hashCode("foo bar baz")
  assertEquals(hash1 !== hash2, true)
})

Deno.test("hashCode should return the same value for the same string", () => {
  const hash1 = hashCode("hello world")
  const hash2 = hashCode("hello world")
  assertEquals(hash1 === hash2, true)
})

Deno.test("hashCode should return a value between 0 and 2^32-1 (inclusive)", () => {
  const hash = hashCode("hello world")
  assertEquals(hash >= 0 && hash <= 4294967295, true)
})

Deno.test("LoadBalancer selects backends with IP_HASH strategy", () => {
  const backends: Backend[] = [
    { host: "192.168.1.1", port: 8080 },
    { host: "192.168.1.2", port: 8080 },
    { host: "192.168.1.3", port: 8080 },
  ]

  // Create a LoadBalancer with IP_HASH strategy
  const loadBalancer = new LoadBalancer(backends, BalancingStrategy.IP_HASH)

  // Mock a client with a remoteAddr property
  // deno-lint-ignore no-explicit-any
  const client: any = { remoteAddr: { transport: "tcp", hostname: "192.168.1.100" } }

  // Select a backend
  const selectedBackend = loadBalancer["selectBackend"](client)

  // Calculate the expected index using the hashCode function
  const expectedIndex = hashCode(client.remoteAddr.hostname) % backends.length

  assertEquals(selectedBackend, backends[expectedIndex])
})
