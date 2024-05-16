import { CurrentRuntime, Runtime } from "@cross/runtime"
import { ApiMemoryUsage, ApiSystemMemory } from "@pup/api-definitions"
import { freemem, loadavg, totalmem, uptime as nodeUptime } from "node:os"

export function memoryUsage(): ApiMemoryUsage {
  let memoryUsageResult: ApiMemoryUsage
  if (CurrentRuntime === Runtime.Deno) {
    //@ts-ignore cross-runtime
    const { external, heapTotal, heapUsed, rss } = Deno.memoryUsage()
    memoryUsageResult = { external, heapTotal, heapUsed, rss }
  } else if (
    CurrentRuntime === Runtime.Node || CurrentRuntime === Runtime.Bun
  ) {
    //@ts-ignore cross-runtime
    const { external = 0, heapTotal, heapUsed, rss } = process.memoryUsage()
    memoryUsageResult = { external, heapTotal, heapUsed, rss }
  } else {
    memoryUsageResult = { external: 0, heapTotal: 0, heapUsed: 0, rss: 0 }
  }
  return memoryUsageResult
}

export function loadAvg(): number[] {
  let loadAvgResult: number[]
  if (CurrentRuntime === Runtime.Deno) {
    loadAvgResult = Deno.loadavg()
  } else if (CurrentRuntime === Runtime.Node || CurrentRuntime === Runtime.Bun) {
    // Node.js and Bun provide os module for loadAvg
    loadAvgResult = loadavg()
  } else {
    // Unsupported runtime
    loadAvgResult = []
  }
  return loadAvgResult
}

export function uptime(): number {
  let uptimeResult: number
  if (CurrentRuntime === Runtime.Deno) {
    uptimeResult = Deno.osUptime()
  } else if (CurrentRuntime === Runtime.Node || CurrentRuntime === Runtime.Bun) {
    // Node.js and Bun provide os module for uptime
    uptimeResult = nodeUptime()
  } else {
    uptimeResult = -1
  }
  return uptimeResult
}

export function systemMemoryInfo(): ApiSystemMemory {
  let memoryInfoResult: ApiSystemMemory
  if (CurrentRuntime === Runtime.Deno) {
    memoryInfoResult = Deno.systemMemoryInfo()
  } else if (CurrentRuntime === Runtime.Node || CurrentRuntime === Runtime.Bun) {
    // Node.js and Bun don't have a direct equivalent to Deno.systemMemoryInfo
    // We can try to approximate values using os module (limited information)
    memoryInfoResult = {
      total: totalmem(),
      free: freemem(),
      available: -1, // Not directly available
      buffers: -1, // Not directly available
      cached: -1, // Not directly available
      swapTotal: -1, // Approximate swap total
      swapFree: -1, // Not directly available
    }
  } else {
    // Unsupported runtime
    memoryInfoResult = {
      total: -1,
      free: -1,
      available: -1,
      buffers: -1,
      cached: -1,
      swapTotal: -1,
      swapFree: -1,
    }
  }
  return memoryInfoResult
}
