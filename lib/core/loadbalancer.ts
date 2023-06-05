/**
 * Classes and interfaces related to the load balancing feature of the application
 *
 * This is a DRAFT for api version 1
 *
 * @file      lib/core/load_balancer.ts
 * @license   MIT
 */

import { copy } from "../../deps.ts"
import { Pup } from "./pup.ts"

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

export class LoadBalancer {
  public readonly pup: Pup

  private backends: InternalBackend[]
  private strategy: BalancingStrategy
  private currentIndex: number
  private validationInterval: number
  private validationTimer: number

  constructor(
    pup: Pup,
    backends: Backend[],
    strategy: BalancingStrategy = BalancingStrategy.ROUND_ROBIN,
    validationInterval: number = 120, // Default to 120 seconds
  ) {
    // Deep copy of incoming backend object, with additional properties
    this.backends = backends.map((backend) => ({
      ...backend,
      connections: 0, // Initialize connections to 0
      up: true,
      failedTransmissions: 0,
    }))

    this.pup = pup

    this.strategy = strategy
    this.currentIndex = 0
    this.validationInterval = validationInterval

    // Validate backends every 120 seconds
    this.validationTimer = setInterval(() => this.validateBackends(), this.validationInterval * 1000) // Continuously validate backends

    // Make the timer non-blocking
    Deno.unrefTimer(this.validationTimer)
  }

  private async proxy(client: Deno.Conn, backend: InternalBackend): Promise<void> {
    const logger = this.pup.logger

    let targetConn
    try {
      targetConn = await Deno.connect(backend)
      backend.connections++ // Increment connections when connected
      backend.failedTransmissions = 0 // Reset failed transmissions
    } catch (_e) {
      backend.failedTransmissions++ // Increment failed transmissions
      if (backend.failedTransmissions >= 5) { // Check if backend should be marked as down
        backend.up = false
        logger.warn("loadbalancer", `Backend ${backend.host}:${backend.port} marked as down`)
      }
      logger.warn("loadbalancer", `Could not connect to backend ${backend.host}:${backend.port}`)
      return
    }
    try {
      await Promise.all([
        copy(client, targetConn),
        copy(targetConn, client),
      ])
    } catch (_err) {
      // Transport error, ignore
      // logger.warn("loadbalancer", "Proxy error:", err)
    } finally {
      backend.connections-- // Decrement connections when closed
      client.close()
      targetConn.close()
    }
  }

  private async validateBackends(): Promise<void> {
    const logger = this.pup.logger

    for (const backend of this.backends) {
      try {
        const connection = await Deno.connect(backend)
        connection.close()
        if (!backend.up) {
          backend.up = true
          logger.warn("loadbalancer", `Backend ${backend.host}:${backend.port} marked as up`)
        }
      } catch (_err) {
        if (backend.up) {
          backend.up = false
          logger.warn("loadbalancer", `Backend ${backend.host}:${backend.port} marked as down`)
        }
      }
    }
  }

  private selectBackend(client: Deno.Conn): InternalBackend | null {
    const { remoteAddr } = client
    switch (this.strategy) {
      case BalancingStrategy.IP_HASH: {
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

      case BalancingStrategy.LEAST_CONNECTIONS: {
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

      case BalancingStrategy.ROUND_ROBIN:
      default: {
        for (let i = 0; i < this.backends.length; i++) {
          const index = (this.currentIndex + i) % this.backends.length
          if (this.backends[index].up) {
            this.currentIndex = (this.currentIndex + 1) % this.backends.length
            return this.backends[index]
          }
        }
        return null
      }
    }
  }

  async start(port: number): Promise<void> {
    const logger = this.pup.logger

    if (!this.backends || this.backends.length === 0) {
      throw new Error("No backends defined")
    }

    const listener = Deno.listen({ port })

    for await (const client of listener) {
      const backend = this.selectBackend(client)
      if (backend) {
        this.proxy(client, backend)
      } else {
        logger.warn("loadbalancer", "No available backend for client")
        client.close()
      }
    }
  }

  close(): void {
    clearInterval(this.validationTimer)
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
