import { ProcessConfiguration } from "../core/configuration.ts"
import { Pup } from "../core/pup.ts"

export type RunnerCallback = (pid?: number) => void

export interface RunnerResult {
  success: boolean
  code?: number
  signal?: Deno.Signal | null
}
export abstract class BaseRunner {
  protected readonly processConfig: ProcessConfiguration
  protected readonly pup: Pup

  constructor(pup: Pup, processConfig: ProcessConfiguration) {
    this.processConfig = processConfig
    this.pup = pup
  }

  abstract run(runningCallback: RunnerCallback): Promise<RunnerResult>
  abstract kill(signal?: Deno.Signal): void
}
