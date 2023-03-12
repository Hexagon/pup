import { Process } from "./process.ts"

class Status {
  /* Keeps track of the last sign of life */
  private lastHeartBeat: Date = new Date()

  /* Properties related to disk write */
  private lastWrite: Date = new Date()
  private statusFileName?: string
  private writeInterval = 2000

  constructor(fileName?: string, writeInterval?: number) {
    if (fileName) {
      this.statusFileName = fileName
    }
    if (writeInterval !== undefined) {
      this.writeInterval = writeInterval
    }
  }

  /* Internal methods */
  public writeToDisk(processes: Process[]) {
    if (this.statusFileName && new Date().getTime() - this.lastWrite.getTime() > this.writeInterval) {
      const processStatuses = processes.map((p) => p.getStatus())

      // Prepare the object to write
      const pupStatus = {
        pid: Deno.pid,
        heartbeat: this.lastHeartBeat,
        processes: processStatuses,
      }
      const result = new TextEncoder().encode(JSON.stringify(pupStatus))

      // Try to write to disk
      try {
        Deno.writeFile(this.statusFileName, result)
      } catch (_e) {
        console.error("Error while writing status to disk.")
      }

      // Update write status
      this.lastWrite = new Date()
    }
  }

  /* Manage heart beat */
  public updateHeartBeat() {
    this.lastHeartBeat = new Date()
  }

  public getHeartBeat() {
    return this.lastHeartBeat
  }
}

export { Status }
