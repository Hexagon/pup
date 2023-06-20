/**
 * Class that writes the current status of pup to disk
 *
 * @file      lib/core/status.ts
 * @license   MIT
 */

import { Application } from "../../application.meta.ts"
import { Cluster } from "./cluster.ts"
import { Process, ProcessInformation, ProcessState } from "./process.ts"

const started = new Date()

/**
 * Represents the current status of the application.
 */
export interface ApplicationState {
  pid: number
  version: string
  status: string
  updated: string
  started: string
  memory: Deno.MemoryUsage
  systemMemory: Deno.SystemMemoryInfo
  loadAvg: number[]
  osUptime: number
  osRelease: string
  denoVersion: { deno: string; v8: string; typescript: string }
  type: string
  processes: ProcessInformation[]
}

/**
 * Represents the status of the application and provides methods to write the status to disk or store.
 */
class Status {
  private storeName?: string

  /**
   * Constructs a new `Status` instance.
   * @param storeName Optional name for the KV store. If not provided, a default name will be used.
   */
  constructor(storeName?: string) {
    this.storeName = storeName
  }

  /**
   * Writes the application status to the KV store with a timestamp as the key.
   * @param applicationState The application state to be stored.
   */
  public async writeToStore(applicationState: ApplicationState) {
    // Try to write to store
    try {
      const kv = await Deno.openKv(this.storeName)
      await kv.set(["application_state", Date.now()], applicationState)
      await kv.set(["last_application_state"], applicationState)
      kv.close()
    } catch (e) {
      console.error("Error while writing status to kv store: " + e.message)
    }
  }
  /**
   * Should make any changes necessary when the application exits, like
   * unsetting last_application_state in the kv store.
   */
  public async cleanup() {
    try {
      const kv = await Deno.openKv(this.storeName)
      await kv.delete(["last_application_state"])
      kv.close()
    } catch (e) {
      console.error("Error while writing status to kv store: " + e.message)
    }
  }

  public async purge(keepHours: number): Promise<number> {
    if (!this.storeName) {
      return 0
    }
    try {
      const store = await Deno.openKv(this.storeName)
      const now = Date.now()
      const startTime = now - keepHours * 60 * 60 * 1000
      const logsByTimeSelector = {
        prefix: ["application_state"],
        end: ["application_state", startTime],
      }
      let rowsDeleted = 0
      for await (const entry of store.list(logsByTimeSelector)) {
        rowsDeleted++
        await store.delete(entry.key)
      }
      store.close()
      return rowsDeleted
    } catch (error) {
      console.error(`Failed to purge logs from store '${this.storeName}': ${error.message}`)
      return 0
    }
  }

  /**
   * Generates the current application state based on the statuses of the processes.
   * @param processes The list of processes to retrieve the statuses from.
   * @returns The application state object.
   */
  public applicationState(processes: Process[]): ApplicationState {
    const processStates: ProcessInformation[] = []
    for (const p of processes) {
      processStates.push(p.getStatus())
      if (p.isCluster()) {
        for (const subP of (p as Cluster).processes) {
          processStates.push(subP.getStatus())
        }
      }
    }
    return {
      pid: Deno.pid,
      version: Application.version,
      status: ProcessState[ProcessState.RUNNING],
      updated: new Date().toISOString(),
      started: started.toISOString(),
      memory: Deno.memoryUsage(),
      systemMemory: Deno.systemMemoryInfo(),
      loadAvg: Deno.loadavg(),
      osUptime: Deno.osUptime(),
      osRelease: Deno.osRelease(),
      denoVersion: Deno.version,
      type: "main",
      processes: processStates,
    }
  }
}

export { Status }
