// load_balancer_test.ts
import { assertEquals, assertThrows } from "@std/assert"
import { type Backend, BalancingStrategy, hashCode, LoadBalancer } from "../../lib/core/loadbalancer.ts"
import { test } from "@cross/test"

// Define logger callback function
const loggerCallback = (severity: string, category: string, text: string) => {
  console.log(`[${severity.toUpperCase()}][${category}] ${text}`)
}

class MockConn implements Deno.Conn {
  rid = 12345 // A random rid, you can replace this
  remoteAddr: Deno.NetAddr = { transport: "tcp", hostname: "", port: 8080 }
  localAddr: Deno.NetAddr = { transport: "tcp", hostname: "0.0.0.0", port: 8080 }

  constructor(hostname: string) {
    this.remoteAddr.hostname = hostname
  }
  ref(): void {/* Implement as needed */}
  unref(): void {/* Implement as needed */}
  readable = new ReadableStream<Uint8Array>()
  writable = new WritableStream<Uint8Array>()

  closeWrite(): Promise<void> {
    return Promise.resolve()
  }
  close(): void {
    return
  }
  read(_p: Uint8Array): Promise<number | null> {
    return Promise.resolve(0)
  }
  write(_p: Uint8Array): Promise<number> {
    return Promise.resolve(0)
  }
  closeRead(): Promise<void> {
    return Promise.resolve()
  }
  async upgrade(): Promise<Deno.FsFile> {
    return Promise.resolve(await Deno.open(await Deno.makeTempFile()))
  }
  [Symbol.dispose](): void {
    this.close()
  }
}

test("LoadBalancer - Initialization", () => {
  const backends: Backend[] = [
    { host: "backend1.example.com", port: 80 },
    { host: "backend2.example.com", port: 80 },
  ]
  const loadBalancer = new LoadBalancer(backends, BalancingStrategy.ROUND_ROBIN, 120, loggerCallback)
  assertEquals(loadBalancer instanceof LoadBalancer, true)
  // Cleanup
  loadBalancer.close()
})

test("LoadBalancer - Throws Error When No Backends are Provided", () => {
  const backends: Backend[] = []
  assertThrows(() => {
    new LoadBalancer(backends, BalancingStrategy.ROUND_ROBIN, 120, loggerCallback)
  })
})

test("LoadBalancer - Initializes with Backends Correctly", () => {
  const backends: Backend[] = [
    { host: "192.168.1.1", port: 8080 },
    { host: "192.168.1.2", port: 8080 },
    { host: "192.168.1.3", port: 8080 },
  ]
  const loadBalancer = new LoadBalancer(backends, BalancingStrategy.ROUND_ROBIN, 120, loggerCallback)

  assertEquals(loadBalancer.backends.length, backends.length)
  loadBalancer.backends.forEach((backend, i) => {
    assertEquals(backend.host, backends[i].host)
    assertEquals(backend.port, backends[i].port)
    assertEquals(backend.connections, 0)
    assertEquals(backend.up, true)
    assertEquals(backend.failedTransmissions, 0)
  })
  // Cleanup
  loadBalancer.close()
})

test("LoadBalancer - Selects Backend with ROUND_ROBIN Strategy", () => {
  const backends: Backend[] = [
    { host: "192.168.1.1", port: 8080 },
    { host: "192.168.1.2", port: 8080 },
    { host: "192.168.1.3", port: 8080 },
  ]
  const loadBalancer = new LoadBalancer(backends, BalancingStrategy.ROUND_ROBIN, 120, loggerCallback)

  let selectedBackend = loadBalancer.selectBackend(new MockConn("192.168.1.10"))
  assertEquals(selectedBackend?.host, backends[0].host)

  selectedBackend = loadBalancer.selectBackend(new MockConn("192.168.1.10"))
  assertEquals(selectedBackend?.host, backends[1].host)

  // Cleanup
  loadBalancer.close()
})

test("LoadBalancer - Selects Backend with IP_HASH Strategy", () => {
  const backends: Backend[] = [
    { host: "192.168.1.1", port: 8080 },
    { host: "192.168.1.2", port: 8080 },
    { host: "192.168.1.3", port: 8080 },
  ]
  const loadBalancer = new LoadBalancer(backends, BalancingStrategy.IP_HASH, 120, loggerCallback)

  const selectedBackend = loadBalancer.selectBackend(new MockConn("192.168.1.10"))
  const selectedBackendIndex = hashCode("192.168.1.10") % backends.length

  assertEquals(selectedBackend?.host, backends[selectedBackendIndex].host)

  // Cleanup
  loadBalancer.close()
})

test("LoadBalancer - Selects Backend with LEAST_CONNECTIONS Strategy", () => {
  const backends: Backend[] = [
    { host: "192.168.1.1", port: 8080 },
    { host: "192.168.1.2", port: 8080 },
    { host: "192.168.1.3", port: 8080 },
  ]
  const loadBalancer = new LoadBalancer(backends, BalancingStrategy.LEAST_CONNECTIONS, 120, loggerCallback)

  let selectedBackend = loadBalancer.selectBackend(new MockConn("192.168.1.10"))
  assertEquals(selectedBackend?.host, backends[0].host)

  // simulate connection to backend 1
  if (selectedBackend) {
    loadBalancer.updateBackendConnectionStatus(selectedBackend, true)
  }

  // next connection should go to backend 2 because it has least connections
  selectedBackend = loadBalancer.selectBackend(new MockConn("192.168.1.11"))
  assertEquals(selectedBackend?.host, backends[1].host)

  // Cleanup
  loadBalancer.close()
})
