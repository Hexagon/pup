/**
 * Everything related to class `Process`, which is the internal representation of a process in Pup
 *
 * @file      lib/core/process.ts
 * @license   MIT
 */

import { Pup } from "./pup.ts"
import { Cron } from "../../deps.ts"
import { Runner } from "./runner.ts"
import { ProcessConfiguration } from "./configuration.ts"
import { Watcher } from "./watcher.ts"

enum ProcessStatus {
  CREATED = 0,
  STARTING = 100,
  RUNNING = 200,
  STOPPING = 250,
  FINISHED = 300,
  ERRORED = 400,
  EXHAUSTED = 450,
  BLOCKED = 500,
}

interface ProcessInformation {
  id: string
  status: ProcessStatus
  code?: number
  signal?: number
  pid?: number
  started?: Date
  exited?: Date
  blocked?: boolean
  restarts?: number
  updated: Date
  pendingRestartReason?: string
  type: "cluster" | "process"
}

interface ProcessInformationParsed {
  id: string
  status: ProcessStatus
  code?: number
  signal?: number
  pid?: number
  started?: string
  exited?: string
  blocked?: boolean
  restarts?: number
  updated: string
}

class Process {
  public readonly config: ProcessConfiguration
  public readonly pup: Pup

  // Subprocess runner
  private runner?: Runner

  // Allow manual block
  private blocked = false

  // Status
  private status: ProcessStatus = ProcessStatus.CREATED
  private pid?: number
  private code?: number
  private signal?: number
  private started?: Date
  private exited?: Date
  private restarts = 0
  private updated: Date = new Date()
  private pendingRestartReason?: string

  constructor(pup: Pup, config: ProcessConfiguration) {
    this.config = config
    this.pup = pup
  }

  private setStatus(s: ProcessStatus) {
    this.status = s
    this.updated = new Date()
  }

  public getStatus(): ProcessInformation {
    return {
      id: this.config.id,
      status: this.status,
      pid: this.pid,
      code: this.code,
      signal: this.signal,
      started: this.started,
      exited: this.exited,
      blocked: this.blocked,
      restarts: this.restarts,
      updated: this.updated,
      pendingRestartReason: this.pendingRestartReason,
      type: "process",
    }
  }

  public isCluster() {
    return false
  }

  public getConfig() {
    return this.config
  }

  public init = () => {
    // Start using cron pattern
    if (this.config.cron) this.setupCron()
    // Restart on file/directory watcher
    if (this.config.watch) this.setupWatch(this.config.watch)
  }

  public start = async (reason?: string, restart?: boolean) => {
    const logger = this.pup.logger

    // Do not start if blocked
    if (this.blocked) {
      logger.log("blocked", `Process blocked, refusing to start`, this.config)

      // Reset pending restart when blocked
      if (this.pendingRestartReason) {
        this.pendingRestartReason = undefined
      }

      return
    }

    // Do not start if running and overrun isn't enabled
    if (this.status === ProcessStatus.RUNNING && !this.config.overrun) {
      logger.log("blocked", `Process still running, refusing to start`, this.config)
      return
    }

    // Do not restart if maximum number of restarts are exhausted
    if (this.restarts >= (this.config.restartLimit ?? Infinity)) {
      logger.log("exhausted", `Maximum number of starts exhausted, refusing to start`, this.config)
      this.setStatus(ProcessStatus.EXHAUSTED)
      return
    }

    logger.log("starting", `Process starting, reason: ${reason}`, this.config)

    // Update status
    this.setStatus(ProcessStatus.STARTING)
    this.pid = undefined
    this.code = undefined
    this.signal = undefined
    this.exited = undefined
    this.started = undefined

    // Start process (await for it to exit)
    this.runner = new Runner(this.pup, this.config)

    // Update restart counter, this is reset on successful exit, new cron run, or manual .stop()
    if (restart) {
      this.restarts = this.restarts + 1
    }

    // Try to start
    // try {
    this.pendingRestartReason = undefined
    const result = await this.runner.run((pid: number) => {
      // Process started
      this.setStatus(ProcessStatus.RUNNING)
      this.pid = pid
      this.started = new Date()
    })

    this.code = result.code
    this.signal = result.signal

    /**
     * Exited - Update status
     *
     * Treat SIGTERM (Exit Code 143) as a non-error exit, to avoid restarts after
     * a manual stop
     */
    if (result.code === 0 || result.code === 143) {
      this.setStatus(ProcessStatus.FINISHED)
      logger.log("finished", `Process finished with code ${result.code}`, this.config)

      /**
       * Exited - Update status
       *
       * Treat all exit codes except 0 and 143(SIGTERM) as errors
       */
    } else {
      this.setStatus(ProcessStatus.ERRORED)
      logger.log("errored", `Process exited with code ${result.code}`, this.config)
    }
    /*} catch (e) {
      this.code = undefined
      this.signal = undefined
      this.setStatus(ProcessStatus.ERRORED)
      logger.log("errored", `Process could not start, error: ${e}`, this.config)
    }*/

    this.exited = new Date()
    this.pid = undefined
    this.runner = undefined
  }

  public stop = (reason: string): boolean => {
    if (this.runner) {
      try {
        this.status = ProcessStatus.STOPPING
        this.pup.logger.log("stopping", `Killing process, reason: ${reason}`, this.config)
        this.runner?.kill("SIGTERM")
        this.restarts = 0
        return true
      } catch (_e) {
        return false
      }
    }
    return false
  }

  public restart = (reason: string) => {
    this.stop(reason)
    this.pendingRestartReason = reason
  }

  public block = () => {
    this.blocked = true
  }

  public unblock = () => {
    this.blocked = false
  }

  private setupCron = () => {
    try {
      // ToDo: Take care of env TZ?
      const cronJob = new Cron(this.config.cron as string, { unref: true }, () => {
        this.start("Cron pattern")
        this.pup.logger.log("scheduler", `${this.config.id} is scheduled to run at '${this.config.cron} (${cronJob.nextRun()?.toLocaleString()})'`)
        this.restarts = 0
      })

      // Initial next run time
      this.pup.logger.log("scheduler", `${this.config.id} is scheduled to run at '${this.config.cron} (${cronJob.nextRun()?.toLocaleString()})'`)
    } catch (e) {
      this.pup.logger.error("scheduled", `Fatal error setup up the cron job for '${this.config.id}', process will not autostart. Error: ${e}`)
    }
  }

  private setupWatch = async (paths: string[]) => {
    const config = this.pup.configuration.watcher
    const watcher = new Watcher({ ...config, paths })
    for await (const watchEvent of watcher) {
      if (watchEvent.some((_) => _.type.includes("modify"))) {
        this.pup.logger.log("watcher", "File change detected", this.config)
        this.restarts = 0
        this.stop("restart")
        // Restart will be handled by watchdog
      }
    }
  }

  public isPendingRestart = () => this.pendingRestartReason !== undefined
}

export { Process, ProcessStatus }
export type { ProcessInformation, ProcessInformationParsed }
