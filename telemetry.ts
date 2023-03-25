/**
 * Optional entrypoint for Pup client processes written in Deno, which periodically sends
 * memory usage and current working directory to the main Pup process.
 *
 * Usage:
 *
 *     //  Early in your application entrypoint - pin to a specific version similar
 *     //  to what your main process use, like pup@1.0.0-alpha-28
 *     import { PupTelemetry } from "https://deno.land/x/pup/telemetry.ts"
 *     const telemetry = PupTelemetry()
 *
 *     // The rest of your application
 *     console.log("Hello World!")
 *
 *     // As PupTelemetry uses the singleton pattern, you can now use the same instance
 *     // anywhere in your application
 *     const telemetry = PupTelemetry()
 *
 *     // To receive messages from another process, use
 *     telemetry.on('event_name', (event) => { console.log(event) });
 *
 *     // To send messages to another process, use
 *     telemetry.emit('target-process-id', 'event_name', { any: { event: "data" }} );
 *
 * @file      telemetry.ts
 * @license   MIT
 */

import { EventEmitter, EventHandler } from "./lib/common/eventemitter.ts"
import { FileIPC } from "./lib/common/ipc.ts"
import { dirExists } from "./lib/common/utils.ts"

export interface TelemetryData {
  sender: string
  memory: Deno.MemoryUsage
  sent: string
  cwd: string
}

export class PupTelemetry {
  private static instance: PupTelemetry

  private events: EventEmitter = new EventEmitter()

  private intervalSeconds = 15

  private timer?: number
  private aborted = false

  /**
   * PupTelemetry singleton instance.
   * The `new` keyword is optional.
   * @param intervalSeconds - The interval in seconds between telemetry data transmissions (default: 15).
   *                          Value is clamped between 1 and 180 seconds.
   */
  constructor(intervalSeconds = 5) {
    // Use as a factory if called without the keyword `new`
    if (!(this instanceof PupTelemetry)) {
      return new PupTelemetry(intervalSeconds)
    }

    // Re-use existing instance (singleton pattern)
    if (PupTelemetry.instance) {
      return PupTelemetry.instance
    }

    // Set instance to the newly created object (singleton pattern)
    PupTelemetry.instance = this

    // Clamp intervalSeconds between 1 and 180 seconds before storing
    if (!intervalSeconds || intervalSeconds < 1) intervalSeconds = 1
    if (intervalSeconds > 180) intervalSeconds = 180
    this.intervalSeconds = intervalSeconds

    // Start the watchdog
    this.telemetryWatchdog()
  }

  private async sendMainTelemetry() {
    const pupTempPath = Deno.env.get("PUP_TEMP_STORAGE")
    const pupProcessId = Deno.env.get("PUP_PROCESS_ID")

    if (pupTempPath && (await dirExists(pupTempPath)) && pupProcessId) {
      const data: TelemetryData = {
        sender: pupProcessId,
        memory: Deno.memoryUsage(),
        sent: new Date().toISOString(),
        cwd: Deno.cwd(),
      }
      this.emit("main", "telemetry", data)
    } else {
      // Ignore, process not run by Pup?
    }
  }

  private async checkIpc() {
    const pupTempPath = Deno.env.get("PUP_TEMP_STORAGE")
    const pupProcessId = Deno.env.get("PUP_PROCESS_ID")

    if (pupTempPath && (await dirExists(pupTempPath)) && pupProcessId) {
      const ipcPath = `${pupTempPath}/.${pupProcessId}.ipc` // Process-specific IPC path
      const ipc = new FileIPC(ipcPath)

      // Read incoming messages
      const messages = await ipc.receiveData()

      // Process messages and emit events
      for (const message of messages) {
        try {
          if (message.data) {
            const parsedMessage = JSON.parse(message.data)
            this.events.emit(parsedMessage.event, parsedMessage.eventData)
          }
        } catch (_e) {
          // Ignore errors in message parsing and processing
        }
      }
    }
  }

  /**
   * The watchdog is guarded by a try/catch block and recursed by a unrefed
   * timer to prevent the watchdog from keeping a process alive.
   */
  private async telemetryWatchdog() {
    try {
      await this.sendMainTelemetry()
      await this.checkIpc()
    } catch (_e) {
      // Ignore errors
    } finally {
      clearTimeout(this.timer)
      if (!this.aborted) {
        this.timer = setTimeout(() => this.telemetryWatchdog(), this.intervalSeconds * 1000)
        Deno.unrefTimer(this.timer)
      }
    }
  }

  on<T>(event: string, fn: EventHandler<T>) {
    this.events.on(event, fn)
  }

  off<T>(event: string, fn: EventHandler<T>) {
    this.events.off(event, fn)
  }

  async emit<T>(targetProcessId: string, event: string, eventData?: T) {
    const pupTempPath = Deno.env.get("PUP_TEMP_STORAGE")

    if (pupTempPath && (await dirExists(pupTempPath)) && targetProcessId) {
      const ipcPath = `${pupTempPath}/.${targetProcessId}.ipc` // Target process IPC path

      const ipc = new FileIPC(ipcPath)

      // Create the message with event and eventData
      const message = { event, eventData }

      // Send the message to the target process
      ipc.sendData(JSON.stringify(message))
    } else {
      // Ignore, process not run by Pup?
    }
  }

  close() {
    this.aborted = true
    if (this.timer) {
      clearTimeout(this.timer)
    }
  }
}
