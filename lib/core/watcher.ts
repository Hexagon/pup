/**
 * Very inspired by watcher.ts from https://github.com/denosaurs/denon - MIT License
 * Original header: "// Copyright 2020-2021 the denosaurs team. All rights reserved. MIT license."
 * 
 * @file watcher.ts
 * @license MIT
 */

import { deferred, delay, globToRegExp, relative } from "../../deps.ts"

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
  private signal = deferred()
  private changes: { [key: string]: FileAction[] } = {}
  private paths: string[] = []
  private interval = 350
  private exts?: string[] = []
  private match?: RegExp[] = []
  private skip?: RegExp[] = []
  private config: WatcherConfig

  constructor(config: WatcherConfig = {}) {
    this.config = config
    this.reload()
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

    if (this.exts?.length && this.exts?.every((ext) => !path.endsWith(ext))) {
      return false
    }

    if (
      this.skip?.length &&
      this.skip?.some((skip) => path.match(skip))
    ) {
      return false
    }

    if (
      this.match?.length && this.match?.every((match) => !path.match(match))
    ) {
      return false
    }
    return true
  }

  private reset(): void {
    this.changes = {}
    this.signal = deferred()
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
    while (true) {
      await this.signal
      yield Object.entries(this.changes).map(([path, type]) => ({
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
    let timer = 0
    const debounce = () => {
      clearTimeout(timer)
      timer = setTimeout(this.signal.resolve, this.interval)
    }

    const run = async () => {
      for await (const event of Deno.watchFs(this.paths)) {
        const { kind, paths } = event
        for (const path of paths) {
          if (this.isWatched(path)) {
            if (!this.changes[path]) this.changes[path] = []
            this.changes[path].push(kind)
            debounce()
          }
        }
      }
    }
    run()
    while (true) {
      debounce()
      await delay(this.interval)
    }
  }
}
