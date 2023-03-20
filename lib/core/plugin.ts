/**
 * Classes and interfaces related to the plugin feature of Pup
 *
 * @file      lib/core/plugin.ts
 * @license   MIT
 */


import { PluginConfiguration } from "./configuration.ts"
import { Pup } from "./pup.ts"

export interface PluginMetadata {
  name: string
  version: string
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
  public async load() {
    const { PupPlugin } = await import(this.config.url)
    this.impl = new PupPlugin(this.pup, this.config) as PluginImplementation
    // ToDo verify plugin
  }
}

/**
 * Every plugin should extend this Class
 */
export class PluginImplementation {
  public meta = {
    name: "Plugin Implemetation",
    version: "0.0.0",
    repository: "https://github.com/hexagon/pup",
  }
  private config: PluginConfiguration
  private pup: Pup
  constructor(pup: Pup, config: PluginConfiguration) {
    this.config = config
    this.pup = pup
  }
  public signal(_signal: string, _parameters: unknown): boolean {
    return false
  }
}
