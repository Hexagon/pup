/**
 * Classes and interfaces related to the plugin feature of Pup
 *
 * @file      lib/core/plugin.ts
 * @license   MIT
 */

import { EventEmitter } from "../common/eventemitter.ts"
import { PluginConfiguration } from "./configuration.ts"
import { Pup } from "./pup.ts"

export interface PluginMetadata {
  name: string
  version: string
  repository: string
}

/**
 * Exposes selected features of pup to Plugins
 */
export class PluginApi {
  public events: EventEmitter
  constructor(pup: Pup) {
    this.events = pup.events
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
  }
}

/**
 * Every plugin should extend this Class
 *
 * Thers is two types of signals
 *
 * hooks, through the hook-function
 *   log                     LogEvent
 *
 * Events, through this.pup.events.on(eventName, eventParams)
 *
 *   Name                    Type
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
    repository: "unset",
  }
  constructor(_pup: PluginApi, _config: PluginConfiguration) {}
  // Default implemetation of hook
  public hook(_signal: string, _parameters: unknown): boolean { return false }
}
