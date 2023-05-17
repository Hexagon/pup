import { copy } from "../../deps.ts"

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
}

export class LoadBalancer {
  private backends: InternalBackend[]
  private strategy: BalancingStrategy
  private currentIndex: number

  constructor(
    backends: Backend[],
    strategy: BalancingStrategy = BalancingStrategy.ROUND_ROBIN,
  ) {
    // Deep copy of incoming backend object, with additional property
    // for current number of connections for LEAST_CONNECTIONS
    this.backends = backends.map((backend) => ({
      ...backend,
      connections: 0, // Initialize connections to 0
    }))

    // Selected strategy for this instance
    this.strategy = strategy

    // Current index used by ROUND_ROBIN
    this.currentIndex = 0
  }

  private async proxy(client: Deno.Conn, backend: InternalBackend): Promise<void> {
    let targetConn
    try {
      targetConn = await Deno.connect(backend)
      backend.connections++ // Increment connections when connected LEAST_CONNECTIONS
    } catch (_e) {
      console.warn(`Could not connect to backend ${backend.host}:${backend.port}`)
      return
    }
    try {
      await Promise.all([
        copy(client, targetConn),
        copy(targetConn, client),
      ])
    } catch (_err) {
      // Transport error, ignore
      //console.error("Proxy error:", err)
    } finally {
      backend.connections-- // Decrement connections when closed LEAST_CONNECTIONS
      client.close()
      targetConn.close()
    }
  }

  private selectBackend(client: Deno.Conn): InternalBackend {
    const { remoteAddr } = client
    switch (this.strategy) {
      case BalancingStrategy.IP_HASH: {
        const hash = remoteAddr ? remoteAddr.transport === "tcp" ? hashCode(remoteAddr.hostname) : 0 : 0
        return this.backends[hash % this.backends.length]
      }

      case BalancingStrategy.LEAST_CONNECTIONS: {
        // Find the backend with the least connections
        const backend = this.backends.reduce((prev, curr) => prev.connections < curr.connections ? prev : curr)
        return backend
      }

      case BalancingStrategy.ROUND_ROBIN:
      default: {
        const backend = this.backends[this.currentIndex]
        this.currentIndex = (this.currentIndex + 1) % this.backends.length
        return backend
      }
    }
  }

  async start(port: number): Promise<void> {
    if (!this.backends || this.backends.length === 0) {
      throw new Error("No backends defined")
    }

    const listener = Deno.listen({ port })

    for await (const client of listener) {
      const backend = this.selectBackend(client)
      this.proxy(client, backend)
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
