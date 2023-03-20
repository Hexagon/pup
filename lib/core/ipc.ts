/**
 * @fileoverview FileIPC is a compact file-based IPC mechanism for Deno.
 * It manages file permissions and ensures that the messages were sent within a reasonable amount of time. The class is used due to Deno's
 * current lack of support for secure cross-platform sockets.
 */

import { fileExists } from "../common/utils.ts"

export interface IpcValidatedMessage {
  pid: number | null
  sent: Date | null
  data: string | null
  errors: string[]
}

export class FileIPC {
  public MAX_DATA_LENGTH = 1024

  private filePath: string
  private staleMessageLimitMs: number

  constructor(filePath: string, staleMessageLimitMs?: number) {
    this.filePath = filePath
    this.staleMessageLimitMs = staleMessageLimitMs ?? 30000
  }

  /**
   * Send data using the file-based IPC.
   *
   * Will append to file in `this.filePath` if it exists, otherwise create a new one
   *
   * @param data - Data to be sent.
   */
  async sendData(data: string): Promise<void> {
    try {
      const fileContent = await Deno.readTextFile(this.filePath).catch(() => "")
      const messages = JSON.parse(fileContent || "[]")
      messages.push({ pid: Deno.pid, data, sent: new Date().toISOString() })
      await Deno.writeTextFile(this.filePath, JSON.stringify(messages), { create: true })
      console.log("Data sent successfully")
    } catch (_e) {
      console.error("Error sending data, read or write failed.")
    }
  }

  /**
   * Receive data from the file-based IPC.
   *
   * Will throw away stale messages (older than staleMessageLimitMs)
   *
   * @returns An array of [received message, or null if the message is invalid]
   */
  async receiveData(): Promise<IpcValidatedMessage[]> {
    if (await fileExists(this.filePath)) {
      let fileContent
      try {
        fileContent = await Deno.readTextFile(this.filePath)
      } catch (_e) {
        throw new Error(`Could not read '${this.filePath}'`)
      }

      // Remove the file instantly, so that any new messages can be queued
      try {
        await Deno.remove(this.filePath)
      } catch (_e) {
        throw new Error(`Failed to remove '${this.filePath}', aborting ipc read.`)
      }

      const receivedMessages: IpcValidatedMessage[] = []

      try {
        const messages = JSON.parse(fileContent || "[]")
        for (const messageObj of messages) {
          let validatedPid: number | null = null
          let validatedSent: Date | null = null
          let validatedData: string | null = null
          const errors: string[] = []

          // Validate pid
          try {
            validatedPid = parseInt(messageObj.pid)
          } catch (_e) {
            errors.push("Invalid data received: pid")
          }

          // Validate sent
          try {
            validatedSent = new Date(Date.parse(messageObj.sent))
          } catch (_e) {
            errors.push("Invalid data received: sent")
          }

          // Validate data
          if (
            validatedSent !== null &&
            validatedSent.getTime() >= Date.now() - this.staleMessageLimitMs
          ) {
            if (!messageObj.data) {
              errors.push("Invalid data received: missing")
            } else if (typeof messageObj.data !== "string") {
              errors.push("Invalid data received: not string")
            } else if (messageObj.data.length >= this.MAX_DATA_LENGTH) {
              errors.push("Invalid data received: too long")
            } else {
              validatedData = messageObj.data
            }
          } else {
            errors.push("Invalid data received: stale")
          }

          receivedMessages.push({
            pid: validatedPid,
            sent: validatedSent,
            data: validatedData,
            errors,
          })
        }
      } catch (_e) {
        throw new Error(`Invalid content in ${this.filePath}.ipc`)
      }

      return receivedMessages
    } else {
      return []
    }
  }

  /**
   * Close the file-based IPC and remove the IPC file.
   */
  async close(): Promise<void> {
    // Try to remove file, ignore failure
    try {
      await Deno.remove(this.filePath)
    } catch (_e) {
      // Ignore
    }
  }
}
