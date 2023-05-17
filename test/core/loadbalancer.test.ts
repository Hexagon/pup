// load_balancer_test.ts
import { assertEquals, assertRejects } from "../deps.ts"
import { Backend, BalancingStrategy, hashCode, InternalBackend, LoadBalancer } from "../../lib/core/loadbalancer.ts"

Deno.test("LoadBalancer - Initialization", () => {
  const backends: Backend[] = [
    { host: "backend1.example.com", port: 80 },
    { host: "backend2.example.com", port: 80 },
  ]
  const loadBalancer = new LoadBalancer(backends)
  assertEquals(loadBalancer instanceof LoadBalancer, true)
})

Deno.test("LoadBalancer - Throws Error When No Backends are Provided", async () => {
  const backends: Backend[] = []
  const loadBalancer = new LoadBalancer(backends)
  await assertRejects(() => {
    return loadBalancer.start(3000)
  })
})

// Grouping tests related to hashCode
Deno.test("LoadBalancer - HashCode Returns a Unique Value for Different Strings", () => {
  const hash1 = hashCode("hello world")
  const hash2 = hashCode("foo bar baz")
  assertEquals(hash1 !== hash2, true)
})

Deno.test("LoadBalancer - HashCode Returns the Same Value for the Same String", () => {
  const hash1 = hashCode("hello world")
  const hash2 = hashCode("hello world")
  assertEquals(hash1 === hash2, true)
})

Deno.test("LoadBalancer - HashCode Returns a Value Between 0 and 2^32-1 (inclusive)", () => {
  const hash = hashCode("hello world")
  assertEquals(hash >= 0 && hash <= 4294967295, true)
})

// Grouping tests related to LoadBalancer strategies
Deno.test("LoadBalancer - Selects Backends with IP_HASH Strategy", () => {
  const backends: Backend[] = [
    { host: "192.168.1.1", port: 8080 },
    { host: "192.168.1.2", port: 8080 },
    { host: "192.168.1.3", port: 8080 },
  ]

  const expectedBackends: InternalBackend[] = [
    { host: "192.168.1.1", port: 8080, connections: 0 },
    { host: "192.168.1.2", port: 8080, connections: 0 },
    { host: "192.168.1.3", port: 8080, connections: 0 },
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

  assertEquals(selectedBackend, expectedBackends[expectedIndex])
})

Deno.test("LoadBalancer - Initializes with LEAST_CONNECTIONS Strategy", () => {
  const backends: Backend[] = [
    { host: "localhost", port: 3000 },
    { host: "localhost", port: 3001 },
  ]
  const lb = new LoadBalancer(backends, BalancingStrategy.LEAST_CONNECTIONS)

  assertEquals(lb["strategy"], BalancingStrategy.LEAST_CONNECTIONS)
})
