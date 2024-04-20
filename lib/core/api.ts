/**
 * Classes and interfaces related to the programmatic api of Pup
 *
 * This is a DRAFT for api version 1
 *
 * @file      lib/core/api.ts
 * @license   MIT
 */

import type { EventEmitter } from "../common/eventemitter.ts"
import type { LogEventData } from "./logger.ts"
import type { Pup } from "./pup.ts"
import type { ProcessLoggerConfiguration } from "./configuration.ts"
import type { ProcessState } from "./process.ts"
import { TelemetryData } from "../../telemetry.ts"

export interface ApiPaths {
  temporaryStorage?: string
  persistentStorage?: string
  configFilePath?: string
}

export interface ApiProcessData {
  status: ApiProcessInformation
  config: ApiProcessConfiguration
}

/**
 * These interfaces are basically copies of the ones in pup core,
 * but specific to the api, to make any incompabilities between the
 * api and core apparent.
 */
interface ApiProcessInformation {
  id: string
  status: ProcessState
  code?: number
  signal?: string
  pid?: number
  started?: Date
  exited?: Date
  blocked?: boolean
  restarts?: number
  updated: Date
  pendingRestartReason?: string
  type: "cluster" | "process" | "worker"
}

interface ApiClusterConfiguration {
  instances?: number
  commonPort?: number
  startPort?: number
  strategy?: string
}

interface ApiProcessConfiguration {
  id: string
  cmd?: string
  worker?: string[]
  env?: Record<string, string>
  cwd?: string
  cluster?: ApiClusterConfiguration
  pidFile?: string
  watch?: string[]
  autostart?: boolean
  cron?: string
  timeout?: number
  overrun?: boolean
  logger?: ProcessLoggerConfiguration
  restart?: string
  restartDelayMs?: number
  restartLimit?: number
}

export interface ApiApplicationState {
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
  processes: ApiProcessInformation[]
}

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
    return this._pup.status.applicationState(this._pup.allProcesses())
  }
  public terminate(forceQuitMs: number) {
    this._pup.terminate(forceQuitMs)
  }
  public start(id: string, reason: string) {
    this._pup.start(id, reason)
  }
  public restart(id: string, reason: string) {
    this._pup.restart(id, reason)
  }
  public stop(id: string, reason: string) {
    this._pup.stop(id, reason)
  }
  public block(id: string, reason: string) {
    this._pup.block(id, reason)
  }
  public unblock(id: string, reason: string) {
    this._pup.unblock(id, reason)
  }
  public telemetry(data: TelemetryData): boolean {
    return this._pup.telemetry(data)
  }
  public log(severity: "log" | "error" | "info" | "warn", consumer: string, message: string) {
    this._pup.logger[severity](`api-${consumer}`, message)
  }
  public async getLogs(processId?: string, startTimeStamp?: number, endTimeStamp?: number, nRows?: number): Promise<LogEventData[]> {
    return await this._pup.logger.getLogContents(processId, startTimeStamp, endTimeStamp, nRows)
  }
}
