/**
 * Provides functions for finding available network ports within a specified range.
 *
 * @file lib/common/port.ts
 * @license MIT
 */

import { createServer } from "node:net"

interface FindFreePortOptions {
  /**
   * The starting port number to begin the search.
   * @default 49152
   */
  startPort?: number

  /**
   * The ending port number (inclusive) for the search.
   * @default 65535
   */
  endPort?: number
}

/**
 * Asynchronously checks if a given port is available.
 *
 * @param port - The port number to check.
 * @returns A promise that resolves to `true` if the port is available, `false` otherwise.
 */
// deno-lint-ignore require-await
async function isPortAvailable(port: number) {
  return new Promise((resolve) => {
    const server = createServer()
    server.on("error", () => resolve(false))
    server.listen(port, () => {
      server.close()
      resolve(true)
    })
  })
}

/**
 * Asynchronously finds an available port within a specified range.
 *
 * @param options - Options for the port search.
 * @returns A promise that resolves to the first available free port.
 * @throws An error if no free ports are found within the range.
 */
export async function findFreePort(options: FindFreePortOptions = {}): Promise<number> {
  const { startPort = 49152, endPort = 65535 } = options

  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port
    }
  }

  throw new Error("No free ports found in the specified range.")
}
