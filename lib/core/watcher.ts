/**
 * Very inspired by watcher.ts from https://github.com/denosaurs/denon - MIT License
 * Original header: "// Copyright 2020-2021 the denosaurs team. All rights reserved. MIT license."
 *
 * @file watcher.ts
 * @license MIT
 */

import { delay, globToRegExp, relative } from "../../deps.ts"

type FileAction = "any" | "access" | "create" | "modify" | "remove" | "other"

export interface FileEvent {
  path: string
  type: FileAction[]
}

export interface WatcherConfig {
  paths?: string[]
  interval?: number
  exts?: string[]
  match?: string[]
  skip?: string[]
}

export class Watcher implements AsyncIterable<FileEvent[]> {
  private signal: Promise<void> // Change deferred to Promise<void>
  private signalResolver!: (value?: void | PromiseLike<void>) => void // Add a resolver
  private changes = new Map<string, FileAction[]>()
  private paths: string[] = []
  private interval = 350
  private exts?: string[] = []
  private match?: RegExp[] = []
  private skip?: RegExp[] = []
  private config: WatcherConfig
  private stopWatching = false

  constructor(config: WatcherConfig = {}) {
    this.config = config
    this.reload()
    // Initialize signal
    this.signal = new Promise((resolve) => {
      this.signalResolver = resolve
    })
  }

  reload(): void {
    this.paths = this.config.paths || []
    this.interval = this.config.interval ?? this.interval
    this.exts = (this.config.exts ?? ["ts", "tsx", "js", "jsx", "json"]).map((_) => _.startsWith(".") ? _ : `.${_}`)
    this.match = (this.config.match ?? ["**/*.*"]).map((_) => globToRegExp(_))
    this.skip = (this.config.skip ?? ["**/.git/**"]).map((_) => globToRegExp(_))
  }

  isWatched(path: string): boolean {
    path = this.verifyPath(path)

    if (this.exts?.length && this.exts.every((ext) => !path.endsWith(ext))) {
      return false
    }

    if (this.skip?.length && this.skip.some((skip) => path.match(skip))) {
      return false
    }

    if (this.match?.length && this.match.every((match) => !path.match(match))) {
      return false
    }
    return true
  }

  private reset(): void {
    this.changes.clear()
    // Reset signal
    this.signal = new Promise((resolve) => {
      this.signalResolver = resolve
    })
  }

  private verifyPath(path: string): string {
    for (const directory of this.paths) {
      const rel = relative(directory, path)
      if (rel && !rel.startsWith("..")) {
        path = relative(directory, path)
      }
    }
    return path
  }

  async *iterate(): AsyncIterator<FileEvent[]> {
    this.watch()
    while (!this.stopWatching) {
      await this.signal
      yield Array.from(this.changes.entries()).map(([path, type]) => ({
        path,
        type,
      }))
      this.reset()
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<FileEvent[]> {
    return this.iterate()
  }

  private async watch(): Promise<void> {
    this.stopWatching = false

    let timer = 0
    const debounce = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        this.signalResolver()
      }, this.interval)
    }

    const run = async () => {
      for await (const event of Deno.watchFs(this.paths)) {
        if (this.stopWatching) {
          break // Exit the loop if stopWatching is true
        }

        const { kind, paths } = event
        for (const path of paths) {
          if (this.isWatched(path)) {
            if (!this.changes.has(path)) this.changes.set(path, [])
            this.changes.get(path)!.push(kind)
            debounce()
          }
        }
      }
    }

    run()

    while (!this.stopWatching) {
      debounce()
      await delay(this.interval)
    }
  }

  public stop() {
    this.stopWatching = true
  }
}
