/**
 * @fileoverview FileIPC is a compact file-based IPC mechanism for Deno.
 * It manages file permissions and ensures that the messages were sent within a reasonable amount of time. The class is used due to Deno's
 * current lack of support for secure cross-platform sockets.
 */

import { fileExists } from "../common/utils.ts"
import { basename, debounce, dirname, join, resolve } from "../../deps.ts"

export interface IpcValidatedMessage {
  pid: number | null
  sent: Date | null
  data: string | null
  errors: string[]
}

export class FileIPC {
  public MAX_DATA_LENGTH = 1024
  private filePath: string
  private dirPath: string
  private fileName: string
  private staleMessageLimitMs: number
  private debounceTimeMs: number
  private messageQueue: IpcValidatedMessage[][] = []
  private aborted = false
  private watcher?: Deno.FsWatcher

  constructor(filePath: string, staleMessageLimitMs?: number, debounceTimeMs?: number) {
    this.filePath = filePath
    this.dirPath = resolve(dirname(filePath)) // Get directory of the file
    this.fileName = basename(filePath) // Get name of the file
    this.staleMessageLimitMs = staleMessageLimitMs ?? 30000
    this.debounceTimeMs = debounceTimeMs ?? 100
  }

  public getFilePath(): string {
    return this.filePath
  }

  /**
   * startWatching method initiates a file watcher on the filePath.
   * When a file modification event occurs, it will debounce the call to extractMessages to ensure it doesn't
   * get called more than once in a short amount of time (as specified by debounceTimeMs). The received messages
   * from the extractMessages call are then added to the messageQueue to be consumed by the receiveData generator.
   */
  public async startWatching() {
    // Create directory if it doesn't exist
    await Deno.mkdir(this.dirPath, { recursive: true })

    // Make an initial call to extractMessages to ensure that any existing messages are consumed
    const messages = await this.extractMessages()
    if (messages.length > 0) {
      this.messageQueue.push(messages)
    }

    // Watch the directory, not the file
    this.watcher = Deno.watchFs(this.dirPath)
    for await (const event of this.watcher) {
      // Check that the event pertains to the correct file
      if (event.kind === "modify" && event.paths.includes(join(this.dirPath, this.fileName))) {
        debounce(async () => {
          try {
            const messages = await this.extractMessages()
            if (messages.length > 0) {
              this.messageQueue.push(messages)
            }
          } catch (_e) { /* Ignore errors */ }
        }, this.debounceTimeMs)()
      }
    }
  }

  /**
   * extractMessages is a private helper function that reads from the IPC file, validates the messages
   * and returns them as an array of IpcValidatedMessage. It also handles the removal of the file after
   * reading and validates the data based on the staleMessageLimitMs.
   *
   * This function is called every time a 'modify' event is detected by the file watcher started in startWatching method.
   *
   * Note: This function should only be used internally by the FileIPC class and is not meant to be exposed to external consumers.
   */
  private async extractMessages(): Promise<IpcValidatedMessage[]> {
    if (await fileExists(this.filePath)) {
      let fileContent
      try {
        fileContent = await Deno.readTextFile(this.filePath)
      } catch (_e) {
        throw new Error(`Could not read '${this.filePath}'`)
      }

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
        return receivedMessages
      } catch (_e) {
        throw new Error(`Invalid content in ${this.filePath}.ipc`)
      }
    } else {
      return []
    }
  }

  /**
   * Send data using the file-based IPC.
   *
   * Will append to file in `this.filePath` if it exists, otherwise create a new one
   *
   * @param data - Data to be sent.
   */
  async sendData(data: string): Promise<void> {
    // Create directory if it doesn't exist
    await Deno.mkdir(this.dirPath, { recursive: true })

    try {
      const fileContent = await Deno.readTextFile(this.filePath).catch(() => "")
      const messages = JSON.parse(fileContent || "[]")
      messages.push({ pid: Deno.pid, data, sent: new Date().toISOString() })
      await Deno.writeTextFile(this.filePath, JSON.stringify(messages), { create: true })
    } catch (_e) {
      console.error("Error sending data, read or write failed.")
    }
  }

  async *receiveData(): AsyncGenerator<IpcValidatedMessage[], void, unknown> {
    if (!this.watcher) this.startWatching()

    while (!this.aborted) {
      if (this.messageQueue.length > 0) {
        const messages = this.messageQueue.shift()
        if (messages) {
          yield messages
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, this.debounceTimeMs))
      }
    }
  }

  /**
   * Close the file-based IPC and remove the IPC file.
   */
  async close(): Promise<void> {
    // Flag as aborted
    this.aborted = true

    // Stop watching
    if (this.watcher) {
      this.watcher.close()
    }
    // Try to remove file, ignore failure
    try {
      await Deno.remove(this.filePath)
    } catch (_e) {
      // Ignore
    }
  }
}
