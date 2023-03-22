/**
 * Classes and interfaces related to the plugin feature of Pup
 *
 * This is a DRAFT for api version 1
 *
 * @file      lib/core/plugin.ts
 * @license   MIT
 */

import { EventEmitter } from "../common/eventemitter.ts"
import { PluginConfiguration, ProcessLoggerConfiguration } from "./configuration.ts"
import { ProcessStatus } from "./process.ts"
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
  status: ProcessStatus
  code?: number
  signal?: string
  pid?: number
  started?: Date
  exited?: Date
  blocked?: boolean
  restarts?: number
  updated: Date
  pendingRestartReason?: string
  type: "cluster" | "process"
}

interface PluginClusterConfiguration {
  instances: number
  commonPort: number
  startPort: number
  strategy: string
}

interface PluginProcessConfiguration {
  id: string
  cmd: string[]
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
  public allProcessStatuses(): PluginProcessData[] {
    const statuses: PluginProcessData[] = this._pup.allProcesses().map((p) => {
      return {
        status: p.getStatus(),
        config: p.getConfig(),
      }
    })
    return statuses
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
    const { PupPlugin } = await import(this.config.url)
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
 *   process_status_changed  ProcessStatusChangedEvent
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
}
