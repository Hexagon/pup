/**
 * A common programmatic interface to the pup core exposing selected features while allowing internal changes, to be used by the rest client and similar features.
 *
 * @file      lib/core/api.ts
 * @license   MIT
 */

import type { EventEmitter } from "@pup/common/eventemitter"
import type { LogEventData } from "./logger.ts"
import type { Pup } from "./pup.ts"
import type { Configuration } from "./configuration.ts"
import type { ApiApplicationState, ApiPaths, ApiProcessData, ApiTelemetryData } from "@pup/api-definitions"

/**
 * Exposes selected features of pup to Plugins and APIs
 */
export class PupApi {
  public events: EventEmitter
  public paths: ApiPaths
  private _pup: Pup
  constructor(pup: Pup) {
    this.events = pup.events
    this._pup = pup
    this.paths = {
      temporaryStorage: pup.temporaryStoragePath,
      persistentStorage: pup.persistentStoragePath,
      configFilePath: pup.configFilePath,
    }
  }

  // State and configuration
  public getConfiguration(): Configuration {
    return this._pup.configuration
  }
  public allProcessStates(): ApiProcessData[] {
    const statuses: ApiProcessData[] = this._pup.allProcesses().map((p) => {
      return {
        status: p.getStatus(),
        config: p.getConfig(),
      }
    })
    return statuses
  }
  public applicationState(): ApiApplicationState {
    return this._pup.status.applicationState(this._pup.allProcesses(), this._pup.port) as ApiApplicationState
  }

  // Global actions
  public terminate(forceQuitMs: number): boolean {
    this._pup.terminate(forceQuitMs)
    return true
  }

  // Process actions
  // - Amending process "all"
  public start(id: string, reason: string): boolean {
    const processesToStart = (id === "all") ? this.allProcessStates() : [this.allProcessStates().find((p) => p.status.id === id)]
    const results = processesToStart.map((process) => this._pup.start(process!.status.id, reason))
    return results.filter((r) => r).length > 0
  }
  public restart(id: string, reason: string): boolean {
    const processesToStart = (id === "all") ? this.allProcessStates() : [this.allProcessStates().find((p) => p.status.id === id)]
    const results = processesToStart.map((process) => this._pup.restart(process!.status.id, reason))
    return results.filter((r) => r).length > 0
  }
  public async stop(id: string, reason: string): Promise<boolean> {
    const processesToStart = (id === "all") ? this.allProcessStates() : [this.allProcessStates().find((p) => p.status.id === id)]
    const results = await Promise.all([processesToStart.map((process) => this._pup.stop(process!.status.id, reason))])
    return results.filter((r) => r).length > 0
  }
  public block(id: string, reason: string): boolean {
    const processesToStart = (id === "all") ? this.allProcessStates() : [this.allProcessStates().find((p) => p.status.id === id)]
    const results = processesToStart.map((process) => this._pup.block(process!.status.id, reason))
    return results.filter((r) => r).length > 0
  }
  public unblock(id: string, reason: string): boolean {
    const processesToStart = (id === "all") ? this.allProcessStates() : [this.allProcessStates().find((p) => p.status.id === id)]
    const results = processesToStart.map((process) => this._pup.unblock(process!.status.id, reason))
    return results.filter((r) => r).length > 0
  }

  // Interface for Pup to receive telemetry data from processes
  public telemetry(data: ApiTelemetryData): boolean {
    return this._pup.telemetry(data)
  }

  public log(severity: "log" | "error" | "info" | "warn", consumer: string, message: string) {
    this._pup.logger[severity](`api-${consumer}`, message)
  }
  public async getLogs(processId?: string, startTimeStamp?: number, endTimeStamp?: number, nRows?: number): Promise<LogEventData[]> {
    return await this._pup.logger.getLogContents(processId, startTimeStamp, endTimeStamp, nRows)
  }
}
