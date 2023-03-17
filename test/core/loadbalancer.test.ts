// load_balancer_test.ts
import { assertEquals, assertRejects } from "../deps.ts"
import { Backend, LoadBalancer /*, LoadBalancingStrategy*/ } from "../../lib/core/loadbalancer.ts"

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

// Add more tests here
