/**
 * Optional entrypoint for Pup client processes written in Deno, which periodically sends
 * memory usage and current working directory to the main Pup process
 *
 * Usage:
 *
 *     //  Early in your application entrypoint - pin to a specific version similar
 *     //  to what your main process use, like pup@1.0.0-alpha-28
 *     import { PupTelemetry } from "https://deno.land/x/pup/telemetry.ts"
 *     PupTelemetry()
 *
 *     // The rest of your application
 *     console.log("Hello World!")
 *
 * @file      telemetry.ts
 * @license   MIT
 */

import { FileIPC } from "./lib/core/ipc.ts"
import { dirExists } from "./lib/common/utils.ts"

export interface TelemetryData {
  sender: string
  memory: Deno.MemoryUsage
  sent: string
  cwd: string
}

/**
 * Sets up Pup telemetry, which sends telemetry data periodically.
 * @param intervalSeconds - The interval in seconds between telemetry data transmissions (default: 15000).
 */
export async function PupTelemetry(intervalSeconds = 15) {
  // Wrap everything in a try/catch-block to prevent the loop from stopping
  try {
    // Pup telemetry require the environment variable PUP_TEMP_PATH
    const pupTempPath = Deno.env.get("PUP_TEMP_STORAGE")
    const pupProcessId = Deno.env.get("PUP_PROCESS_ID")

    if (pupTempPath && await dirExists(pupTempPath) && pupProcessId) {
      const ipcPath = `${pupTempPath}/.ipc`
      const ipc = new FileIPC(ipcPath)
      const data: TelemetryData = {
        "sender": pupProcessId,
        "memory": Deno.memoryUsage(),
        "sent": new Date().toISOString(),
        "cwd": Deno.cwd(),
      }
      ipc.sendData(JSON.stringify({ telemetry: data }))
    } else {
      // Ignore, process not run by Pup?
    }
  } catch (_e) {
    // Ignore errors
  } finally {
    // Clamp the interval within a range of 5 to 180 seconds
    if (!intervalSeconds || intervalSeconds < 5) intervalSeconds = 5
    if (intervalSeconds > 180) intervalSeconds = 180

    // Set up an unrefed recursion timer
    const timer = setTimeout(PupTelemetry, intervalSeconds * 1000)
    Deno.unrefTimer(timer)
  }
}
