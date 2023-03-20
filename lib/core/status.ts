/**
 * Class that writes the current status of pup to disk
 *
 * @file      lib/core/status.ts
 * @license   MIT
 */

import { Application } from "../../application.meta.ts"
import { Cluster } from "./cluster.ts"
import { Process, ProcessInformation } from "./process.ts"

class Status {
  /* Properties related to disk write */
  private statusFileName?: string

  constructor(fileName?: string) {
    if (fileName) {
      this.statusFileName = fileName
    }
  }

  /* Internal methods */
  public async writeToDisk(processes: Process[]) {
    if (this.statusFileName) {
      // Get status from all processes
      const processStatuses: ProcessInformation[] = []
      for (const p of processes) {
        processStatuses.push(p.getStatus())
        if (p.isCluster()) {
          for (const subP of (p as Cluster).processes) processStatuses.push(subP.getStatus())
        }
      }

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
        await Deno.writeFile(this.statusFileName, result)
      } catch (_e) {
        console.error("Error while writing status to disk.")
      }
    }
  }
}

export { Status }
