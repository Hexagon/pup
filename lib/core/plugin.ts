/**
 * Classes and interfaces related to the plugin feature of Pup
 *
 * This is a DRAFT for api version 1
 *
 * @file      lib/core/plugin.ts
 * @license   MIT
 */

import { Application } from "../../application.meta.ts"
import { EventEmitter } from "../common/eventemitter.ts"
import { PluginConfiguration, ProcessLoggerConfiguration } from "./configuration.ts"
import { LogEventData } from "./logger.ts"
import { ProcessState } from "./process.ts"
import { Pup } from "./pup.ts"

const SUPPORTED_API_VERSIONS = ["1"]

export interface PluginMetadata {
  name: string
  version: string
  api: string
  repository: string
}

/**
 * These interfaces are basically copies of the ones in pup core,
 * but specific to plugins, to make any incompabilities between the
 * plugin api and core apparent.
 */
interface PluginProcessInformation {
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

interface PluginClusterConfiguration {
  instances?: number
  commonPort?: number
  startPort?: number
  strategy?: string
}

interface PluginProcessConfiguration {
  id: string
  cmd?: string
  worker?: string[]
  env?: Record<string, string>
  cwd?: string
  cluster?: PluginClusterConfiguration
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

export interface PluginProcessData {
  status: PluginProcessInformation
  config: PluginProcessConfiguration
}

export interface PluginApplicationState {
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
  processes: PluginProcessInformation[]
}

export interface PluginPaths {
  temporaryStorage?: string
  persistentStorage?: string
  configFilePath?: string
}

/**
 * Exposes selected features of pup to Plugins
 */
export class PluginApi {
  public events: EventEmitter
  public paths: PluginPaths
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
  public allProcessStates(): PluginProcessData[] {
    const statuses: PluginProcessData[] = this._pup.allProcesses().map((p) => {
      return {
        status: p.getStatus(),
        config: p.getConfig(),
      }
    })
    return statuses
  }
  public applicationState(): PluginApplicationState {
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
  public log(severity: "log" | "error" | "info" | "warn", plugin: string, message: string) {
    this._pup.logger[severity](`plugin-${plugin}`, message)
  }
  public async getLogs(processId?: string, startTimeStamp?: number, endTimeStamp?: number, nRows?: number): Promise<LogEventData[]> {
    return await this._pup.logger.getLogContents(processId, startTimeStamp, endTimeStamp, nRows)
  }
}

/**
 * Internal representation of a plugin
 */
export class Plugin {
  private pup: Pup
  private config: PluginConfiguration
  public impl?: PluginImplementation
  constructor(pup: Pup, config: PluginConfiguration) {
    this.pup = pup
    this.config = config
  }
  /**
   * Will throw on any error
   */
  public async load() {
    const url = this.config.url.replace("$VERSION", Application.version)
    const { PupPlugin } = await import(url)
    this.impl = new PupPlugin(new PluginApi(this.pup), this.config) as PluginImplementation
  }
  public verify() {
    if (!this.impl || this.impl.meta.name === "unset") {
      throw new Error("Plugin missing meta.name")
    }
    if (!this.impl || this.impl.meta.repository === "unset") {
      throw new Error("Plugin missing meta.repository")
    }
    if (!this.impl || this.impl.meta.version === "unset") {
      throw new Error("Plugin missing meta.version")
    }
    if (!this.impl || this.impl.meta.api === "unset") {
      throw new Error("Plugin missing meta.api")
    }
    if (SUPPORTED_API_VERSIONS.indexOf(this.impl?.meta.api) < 0) {
      throw new Error("Plugin version not supported")
    }
  }
  async terminate() {
    await this.impl?.cleanup()
  }
}

/**
 * Every plugin should extend this Class
 *
 * There are two types of signals
 *
 * hooks, through the hook-function
 *   log                     LogEvent
 *
 * Events, through this.pup.events.on(eventName, eventParams)
 *
 *   log                     LogEvent
 *   init                    Undefined
 *   watchdog                Undefined
 *   process_status_changed  ProcessStateChangedEvent
 *   process_scheduled       ProcessScheduledEvent
 *   process_watch           ProcessWatchEvent
 *   terminating             Number (ms)
 *   ipc                     IpcValidatedMessage
 */
export class PluginImplementation {
  public meta = {
    name: "unset",
    version: "unset",
    api: "unset",
    repository: "unset",
  }
  constructor(_pup: PluginApi, _config: PluginConfiguration) {}
  // Default implemetation of hook
  public hook(_signal: string, _parameters: unknown): boolean {
    return false
  }
  // Default implemetation of the cleanup function
  public async cleanup() {
    return await false
  }
}
