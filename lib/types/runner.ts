/**
 * Common features of all runners (currently implemented by core/runner.ts and core/worker.ts)
 *
 * @file      lib/types/runner.ts
 * @license   MIT
 */

import type { ProcessConfiguration } from "../core/configuration.ts"
import type { Pup } from "../core/pup.ts"

export type RunnerCallback = (pid?: number) => void

export interface RunnerResult {
  success: boolean
  code?: number
  signal?: unknown
}
export abstract class BaseRunner {
  protected readonly processConfig: ProcessConfiguration
  protected readonly pup: Pup

  constructor(pup: Pup, processConfig: ProcessConfiguration) {
    this.processConfig = processConfig
    this.pup = pup
  }

  abstract run(runningCallback: RunnerCallback): Promise<RunnerResult>
  abstract kill(signal?: unknown): void
}
