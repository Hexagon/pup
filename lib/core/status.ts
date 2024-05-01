/**
 * Class that writes the current status of pup to disk
 *
 * @file      lib/core/status.ts
 * @license   MIT
 */

import { Application } from "../../application.meta.ts"
import type { Cluster } from "./cluster.ts"
import { APPLICATION_STATE_WRITE_LIMIT_MS } from "./configuration.ts"
import { type Process, type ProcessInformation } from "./process.ts"
import { ApiProcessState } from "@pup/api-definitions"

import { Prop } from "../common/prop.ts"

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
  port: number
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
  private lastWrite = Date.now()

  /**
   * Constructs a new `Status` instance.
   * @param storeName Optional name for the KV store. If not provided, a default name will be used.
   */
  constructor(storeName?: string) {
    this.storeName = storeName
  }

  /**
   * Writes the application status to the KV store with a timestamp as part of the key.
   *
   * Key ["last_application_state"] is written every iteration.
   * Key ["application_state", <timestamp>] is written at most once per 20 seconds.
   * @param applicationState The application state to be stored.
   */
  public async writeToStore(applicationState: ApplicationState) {
    try {
      const kv = await Deno.openKv(this.storeName)

      // Initialize lastWrite if it's not set
      if (!this.lastWrite) {
        this.lastWrite = 0
      }

      // Write application_state at most once per APPLICATION_STATE_WRITE_LIMIT_MS
      if (Date.now() - this.lastWrite > APPLICATION_STATE_WRITE_LIMIT_MS) {
        this.lastWrite = Date.now()
        await kv.set(["application_state", Date.now()], applicationState)
      }

      // Always write last_application_state
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

  /**
   * Deletes the application_state logs older than the given number of hours.
   *
   * @param keepHours The number of hours worth of logs to keep.
   * @returns The number of rows deleted.
   */
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
  public applicationState(processes: Process[], port?: Prop): ApplicationState {
    const processStates: ProcessInformation[] = []
    for (const p of processes) {
      processStates.push(p.getStatus())
    }
    return {
      pid: Deno.pid,
      version: Application.version,
      status: ApiProcessState[ApiProcessState.RUNNING],
      updated: new Date().toISOString(),
      started: started.toISOString(),
      memory: Deno.memoryUsage(),
      port: port ? parseInt(port.fromCache()!, 10) : 0,
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
