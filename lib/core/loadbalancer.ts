import { copy } from "../../deps.ts"

export enum LoadBalancingStrategy {
  ROUND_ROBIN,
  SOURCE_IP_HASH,
}

export interface Backend {
  host: string
  port: number
}

export class LoadBalancer {
  private backends: Backend[]
  private strategy: LoadBalancingStrategy
  private currentIndex: number

  constructor(
    backends: Backend[],
    strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN,
  ) {
    this.backends = backends
    this.strategy = strategy
    this.currentIndex = 0
  }

  private async proxy(
    client: Deno.Conn,
    backend: Backend,
  ): Promise<void> {
    const targetConn = await Deno.connect(backend)
    try {
      await Promise.all([copy(client, targetConn), copy(targetConn, client)])
    } catch (_err) {
      //console.error("Proxy error:", err)
    } finally {
      client.close()
      targetConn.close()
    }
  }

  private selectBackend(client: Deno.Conn): Backend {
    const { remoteAddr } = client
    switch (this.strategy) {
      case LoadBalancingStrategy.SOURCE_IP_HASH: {
        const hash = remoteAddr ? remoteAddr.transport === "tcp" ? hashCode(remoteAddr.hostname) : 0 : 0
        return this.backends[hash % this.backends.length]
      }

      case LoadBalancingStrategy.ROUND_ROBIN:
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

// Helper method to generate hashcode for strings
function hashCode(s: string) {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const character = s.charCodeAt(i)
    hash = (hash << 5) - hash + character
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}
