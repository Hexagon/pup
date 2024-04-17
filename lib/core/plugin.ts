/**
 * Classes and interfaces related to the plugin feature of Pup
 *
 * This is a DRAFT for api version 1
 *
 * @file      lib/core/plugin.ts
 * @license   MIT
 */

import { Application } from "../../application.meta.ts"
import { PupApi } from "./api.ts"
import type { PluginConfiguration } from "./configuration.ts"
import type { Pup } from "./pup.ts"

const SUPPORTED_API_VERSIONS = ["1"]

export interface PluginMetadata {
  name: string
  version: string
  api: string
  repository: string
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
    this.impl = new PupPlugin(new PupApi(this.pup), this.config) as PluginImplementation
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
    if (this.impl?.cleanup) await this.impl?.cleanup()
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
  constructor(_pup: PupApi, _config: PluginConfiguration) {}
  // Default implemetation of hook
  public hook(_signal: string, _parameters: unknown): boolean {
    return false
  }
  // Default implemetation of the cleanup function
  public async cleanup(): Promise<boolean> {
    return await false
  }
}
