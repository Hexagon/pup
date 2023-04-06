/**
 * Class that writes the current status of pup to disk
 *
 * @file      lib/core/status.ts
 * @license   MIT
 */

import { Application } from "../../application.meta.ts"
import { Cluster } from "./cluster.ts"
import { Process, ProcessInformation, ProcessState } from "./process.ts"

export interface ApplicationState {
  pid: number
  version: string
  status: string
  updated: string
  started: string
  memory: Deno.MemoryUsage
  type: string
  processes: ProcessInformation[]
}

const started = new Date()

class Status {
  /* Properties related to disk write */
  private statusFileName?: string

  constructor(fileName?: string) {
    if (fileName) {
      this.statusFileName = fileName
    }
  }

  /* Internal methods */
  public async writeToDisk(applicationState: ApplicationState) {
    if (this.statusFileName) {
      // Prepare the object to write
      const result = new TextEncoder().encode(JSON.stringify(applicationState))

      // Try to write to disk
      try {
        await Deno.writeFile(this.statusFileName, result)
      } catch (e) {
        console.error("Error while writing status to disk: " + e.message)
      }
    }
  }

  public applicationState(processes: Process[]): ApplicationState {
    // Get status from all processes
    const processStates: ProcessInformation[] = []
    for (const p of processes) {
      processStates.push(p.getStatus())
      if (p.isCluster()) {
        for (const subP of (p as Cluster).processes) processStates.push(subP.getStatus())
      }
    }

    return {
      pid: Deno.pid,
      version: Application.version,
      status: ProcessState[ProcessState.RUNNING],
      updated: new Date().toISOString(),
      started: started.toISOString(),
      memory: Deno.memoryUsage(),
      type: "main",
      processes: processStates,
    }
  }
}

export { Status }
