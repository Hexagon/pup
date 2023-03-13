import { Application } from "../../pup.ts"
import { Process } from "./process.ts"

class Status {
  /* Properties related to disk write */
  private statusFileName?: string

  constructor(fileName?: string) {
    if (fileName) {
      this.statusFileName = fileName
    }
  }

  /* Internal methods */
  public writeToDisk(processes: Process[]) {
    if (this.statusFileName) {
      const processStatuses = processes.map((p) => p.getStatus())

      // Prepare the object to write
      const pupStatus = {
        pid: Deno.pid,
        version: Application.version,
        updated: new Date().toISOString(),
        processes: processStatuses,
      }
      const result = new TextEncoder().encode(JSON.stringify(pupStatus))

      // Try to write to disk
      try {
        Deno.writeFile(this.statusFileName, result)
      } catch (_e) {
        console.error("Error while writing status to disk.")
      }
    }
  }
}

export { Status }
