/**
 * Classes and interfaces related to the load balancing feature of the application. Intended to be run through a worker.
 *
 * @file      lib/core/loadbalancer.ts
 * @license   MIT
 */

import { CurrentRuntime, Runtime } from "@cross/runtime"
import { LOAD_BALANCER_DEFAULT_VALIDATION_INTERVAL_S } from "./configuration.ts"

export enum BalancingStrategy {
  ROUND_ROBIN,
  IP_HASH,
  LEAST_CONNECTIONS,
}

export interface Backend {
  host: string
  port: number
}

export interface InternalBackend extends Backend {
  connections: number
  up: boolean
  failedTransmissions: number
}

export interface LoadBalancerStartOperation {
  operation: "start"
  backends: Backend[]
  strategy: BalancingStrategy
  validationInterval: number
  commonPort: number
}

export class LoadBalancer {
  //public readonly pup: Pup

  private listener: Deno.Listener | null = null

  public backends: InternalBackend[]
  private strategy: BalancingStrategy
  private currentIndex: number
  private validationInterval: number
  private validationTimer: number

  private loggerCallback: (severity: string, category: string, text: string) => void

  constructor(
    backends: Backend[],
    strategy: BalancingStrategy = BalancingStrategy.ROUND_ROBIN,
    validationInterval: number = LOAD_BALANCER_DEFAULT_VALIDATION_INTERVAL_S,
    loggerCallback: (severity: string, category: string, text: string) => void,
  ) {
    // Deep copy of incoming backend object, with additional properties
    this.backends = this.initializeBackends(backends)
    if (this.backends.length < 1) {
      throw new Error("No backends supplied")
    }
    this.strategy = strategy
    this.currentIndex = 0
    this.validationInterval = validationInterval
    // Validate backends every 120 seconds
    this.validationTimer = this.setupValidationTimer() // Continuously validate

    this.loggerCallback = loggerCallback
  }

  private initializeBackends(backends: Backend[]): InternalBackend[] {
    return backends.map((backend) => ({
      ...backend,
      connections: 0, // Initialize connections to 0
      up: true,
      failedTransmissions: 0,
    }))
  }

  private setupValidationTimer(): number {
    const timer = setInterval(() => this.validateBackends(), this.validationInterval * 1000)
    // Make the timer non-blocking
    if (CurrentRuntime === Runtime.Deno) {
      Deno.unrefTimer(timer)
      // @ts-ignore unref exists in node and bun
    } else if (timer.unref) {
      // @ts-ignore unref exists in node and bun
      timer.unref()
    }
    return timer
  }

  private async proxy(client: Deno.Conn, backend: InternalBackend): Promise<void> {
    let targetConn
    try {
      targetConn = await Deno.connect(backend)
      this.updateBackendConnectionStatus(backend, true)
    } catch (_e) {
      this.handleConnectionFailure(backend)
      return
    }
    await this.handleProxyCommunication(client, targetConn, backend)
  }

  public updateBackendConnectionStatus(backend: InternalBackend, isConnected: boolean): void {
    // Increment connections when connected
    // Decrement connections when closed
    if (isConnected) {
      backend.connections++
      backend.failedTransmissions = 0 // Reset failed transmissions
    } else {
      backend.connections--
    }
  }

  private handleConnectionFailure(backend: InternalBackend): void {
    backend.failedTransmissions++ // Increment failed transmissions
    if (backend.failedTransmissions >= 5) { // Check if backend should be marked as down
      backend.up = false
      this.loggerCallback("warn", "loadbalancer", `Backend ${backend.host}:${backend.port} marked as down`)
    }
    this.loggerCallback("warn", "loadbalancer", `Could not connect to backend ${backend.host}:${backend.port}`)
  }

  private async handleProxyCommunication(client: Deno.Conn, targetConn: Deno.Conn, backend: InternalBackend): Promise<void> {
    try {
      const clientReadable = client.readable
      const targetWritable = targetConn.writable

      // Pipe data from client to backend
      const clientPipe = clientReadable.pipeTo(targetWritable)

      // Pipe data from backend to client (assuming bidirectional communication)
      const backendReadable = targetConn.readable
      const clientWritable = client.writable
      const backendPipe = backendReadable.pipeTo(clientWritable)

      await Promise.all([clientPipe, backendPipe])
    } catch (_err) {
      // Handle transport error if needed
      // logger("warn", "loadbalancer", "Proxy error:", err)
    } finally {
      this.updateBackendConnectionStatus(backend, false)
      try {
        client.close()
      } catch (_clientCloseErr) { /* Ignore */ }
      try {
        targetConn.close()
      } catch (_targetCloseErr) { /* Ignore */ }
    }
  }

  private async validateBackends(): Promise<void> {
    for (const backend of this.backends) {
      try {
        const connection = await Deno.connect(backend)
        connection.close()
        if (!backend.up) {
          backend.up = true
          this.loggerCallback("warn", "loadbalancer", `Backend ${backend.host}:${backend.port} marked as up`)
        }
      } catch (_err) {
        this.markBackendAsDown(backend)
      }
    }
  }

  private markBackendAsDown(backend: InternalBackend): void {
    if (backend.up) {
      backend.up = false
      this.loggerCallback("warn", "loadbalancer", `Backend ${backend.host}:${backend.port} marked as down`)
    }
  }

  public selectBackend(client: Deno.Conn): InternalBackend | null {
    switch (this.strategy) {
      case BalancingStrategy.IP_HASH:
        return this.selectIpHashBackend(client)
      case BalancingStrategy.LEAST_CONNECTIONS:
        return this.selectLeastConnectionsBackend()
      case BalancingStrategy.ROUND_ROBIN:
      default:
        return this.selectRoundRobinBackend()
    }
  }

  private selectIpHashBackend(client: Deno.Conn): InternalBackend | null {
    const { remoteAddr } = client
    const hash = remoteAddr ? remoteAddr.transport === "tcp" ? hashCode(remoteAddr.hostname) : 0 : 0
    const startIndex = hash % this.backends.length
    for (let i = 0; i < this.backends.length; i++) {
      const index = (startIndex + i) % this.backends.length
      if (this.backends[index].up) {
        return this.backends[index]
      }
    }
    return null
  }

  private selectLeastConnectionsBackend(): InternalBackend | null {
    let minConnection = Infinity
    let backend: InternalBackend | null = null
    for (let i = 0; i < this.backends.length; i++) {
      if (this.backends[i].up && this.backends[i].connections < minConnection) {
        minConnection = this.backends[i].connections
        backend = this.backends[i]
      }
    }
    return backend
  }

  private selectRoundRobinBackend(): InternalBackend | null {
    for (let i = 0; i < this.backends.length; i++) {
      const index = (this.currentIndex + i) % this.backends.length
      if (this.backends[index].up) {
        this.currentIndex = (this.currentIndex + 1) % this.backends.length
        return this.backends[index]
      }
    }
    return null
  }

  async start(port: number): Promise<void> {
    if (!this.backends || this.backends.length === 0) {
      throw new Error("No backends defined")
    }

    this.listener = Deno.listen({ port })
    for await (const client of this.listener) {
      const backend = this.selectBackend(client)
      if (backend) {
        this.proxy(client, backend)
      } else {
        this.loggerCallback("warn", "loadbalancer", "No available backend for client")
        client.close()
      }
    }
  }

  close(): void {
    clearInterval(this.validationTimer)
    if (this.listener) {
      this.listener.close()
      this.listener = null
    }
  }
}

/**
 * Generates a hash code for a given IP address string, based on a simple
 * hashing algorithm that distributes the values evenly across an array.
 *
 * @param {string} s - The IP address/hostname to generate a hash code for.
 * @returns {number} The hash code for the IP address.
 *
 * @example
 * // Returns 31679
 * const hash1 = ipHash("192.168.1.1");
 *
 * // Returns 48437
 * const hash2 = ipHash("10.0.0.1");
 */
export function hashCode(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const character = s.charCodeAt(i)
    hash = (hash << 5) - hash + character
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash)
}
