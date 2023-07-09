/**
 * Everything related to class `Process`, which is the internal representation of a process in Pup
 *
 * @file      lib/core/process.ts
 * @license   MIT
 */

import { Pup } from "./pup.ts"
import { Cron, delay } from "../../deps.ts"
import { Runner } from "./runner.ts"
import { WorkerRunner } from "./worker.ts"
import { ProcessConfiguration } from "./configuration.ts"
import { Watcher } from "./watcher.ts"
import { TelemetryData } from "../../telemetry.ts"
import { resolve } from "https://deno.land/std@0.183.0/path/win32.ts"

/**
 * Represents the state of a process in Pup.
 *
 * NEVER change or delete any existing mapping,
 * just add new ones.
 */
enum ProcessState {
  CREATED = 0,
  STARTING = 100,
  RUNNING = 200,
  STOPPING = 250,
  FINISHED = 300,
  ERRORED = 400,
  EXHAUSTED = 450,
}

interface ProcessStateChangedEvent {
  old?: ProcessState
  new?: ProcessState
  status: ProcessInformation
}

interface ProcessScheduledEvent {
  next?: ProcessState
  status: ProcessInformation
}

interface ProcessWatchEvent {
  at: Date
  status: ProcessInformation
}

interface ProcessInformation {
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
  telemetry?: TelemetryData
  type: "cluster" | "process" | "worker"
}

class Process {
  public readonly config: ProcessConfiguration
  public readonly pup: Pup

  // Subprocess runner
  private runner?: Runner | WorkerRunner

  // Allow manual block
  private blocked = false

  // Cron job
  private cronJob?: Cron

  // Cron job
  private cronTerminateJob?: Cron

  // Status
  private status: ProcessState = ProcessState.CREATED
  private pid?: number
  private code?: number
  private signal?: string
  private started?: Date
  private exited?: Date
  private restarts = 0
  private updated: Date = new Date()
  private pendingRestartReason?: string
  private telemetry?: TelemetryData

  constructor(pup: Pup, config: ProcessConfiguration) {
    this.config = config
    this.pup = pup
  }

  public setTelemetry(t: TelemetryData) {
    this.telemetry = t
  }

  private setStatus(s: ProcessState) {
    const oldVal = this.status
    this.status = s
    this.updated = new Date()
    this.pup.events.emit("process_status_changed", {
      old: oldVal,
      new: this.status,
      status: this.getStatus(),
    })
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
      telemetry: this.telemetry,
      pendingRestartReason: this.pendingRestartReason,
      type: this.config.worker ? "worker" : "process",
    }
  }

  public isCluster() {
    return false
  }

  public getConfig() {
    return this.config
  }

  /**
   * Initialize process setup, watchers and events.
   */
  public init() {
    // Start using cron pattern
    if (this.config.cron) this.setupCron()
    // Terminate using cron pattern
    if (this.config.terminate) this.setupCronTerminate()
    // Restart on file/directory watcher
    if (this.config.watch) this.setupWatch(this.config.watch)
    // Send initial process status
    this.pup.events.emit("process_status_changed", {
      old: null,
      new: this.status,
      status: this.getStatus(),
    })
  }

  /**
   * Starts the process after validating the conditions for start.
   * @param {string} [reason] - The reason for starting the process.
   * @param {boolean} [restart] - If the process is a restart.
   */
  public async start(reason?: string, restart?: boolean) {
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
    if (this.status === ProcessState.RUNNING && !this.config.overrun) {
      logger.log("blocked", `Process still running, refusing to start`, this.config)
      return
    }

    // Do not restart if maximum number of restarts are exhausted
    if (this.restarts >= (this.config.restartLimit ?? Infinity)) {
      logger.log("exhausted", `Maximum number of starts exhausted, refusing to start`, this.config)
      this.setStatus(ProcessState.EXHAUSTED)
      return
    }

    logger.log("starting", `Process starting, reason: ${reason}`, this.config)

    // Update status
    this.setStatus(ProcessState.STARTING)
    this.pid = undefined
    this.code = undefined
    this.signal = undefined
    this.exited = undefined
    this.started = undefined
    this.telemetry = undefined

    // Start process (await for it to exit)
    if (this.config.worker) {
      this.runner = new WorkerRunner(this.pup, this.config)
    } else if (this.config.cmd) {
      this.runner = new Runner(this.pup, this.config)
    } else {
      throw new Error("No command or worker specified")
    }

    // Update restart counter, this is reset on successful exit, new cron run, or manual .stop()
    if (restart) {
      this.restarts = this.restarts + 1
    }

    // Try to start
    try {
      this.pendingRestartReason = undefined
      const result = await this.runner.run((pid?: number) => {
        // Process started
        this.setStatus(ProcessState.RUNNING)
        this.pid = pid
        this.started = new Date()
      })

      this.code = result.code
      this.signal = result.signal as string

      /**
       * Exited - Update status
       */
      if (result.code === 0) {
        this.setStatus(ProcessState.FINISHED)
        logger.log("finished", `Process finished with code ${result.code}`, this.config)

        /**
         * Forcefully stopped
         */
      } else if (result.code === 124) {
        this.setStatus(ProcessState.FINISHED)
        logger.log("finished", `Process manually stopped with code ${result.code}`, this.config)

        /**
         * Exited - Update status
         *
         * Treat all exit codes except 0 as errors
         */
      } else {
        this.setStatus(ProcessState.ERRORED)
        logger.log("errored", `Process exited with code ${result.code}`, this.config)
      }
    } catch (e) {
      this.code = 1
      this.signal = undefined
      this.setStatus(ProcessState.ERRORED)
      logger.log("errored", `Process exited with error: ${e}`, this.config)
    }

    this.exited = new Date()
    this.pid = undefined
    this.runner = undefined
  }

  /**
   * Stops the process and cleans up the resources.
   * @param {string} reason - The reason for stopping the process.
   * @returns {boolean} - Returns true if the process was stopped successfully, false otherwise.
   */
  public stop = async (reason: string): Promise<boolean> => {
    if (!this.runner) {
      return false;
    }

    this.setStatus(ProcessState.STOPPING)
    const abortTimers = new AbortController();

    // Stop process after `terminateGracePeriod`
    delay((this.config.terminateGracePeriod ?? 0) * 1000, {signal: abortTimers.signal}).then(() => {
      this.pup.logger.log("stopping", `Stopping process, reason: ${reason}`, this.config)
      // ToDo, send SIGTERM or SIGINT instead of SIGKILL as soon as Dax supports it
      return this.killRunner(reason)
    }).catch(() => false),

    // Kill process after `terminateTimeout`
    delay((this.config.terminateTimeout ?? 30) * 1000, {signal: abortTimers.signal}).then(() => {
      this.pup.logger.log("stopping", `Killing process, reason: ${reason}`, this.config)
      return this.killRunner(reason)
    }).catch(() => false)

    const finished = new Promise<boolean>((resolve) => {
      const onFinish = (ev) => {
        if (ev.status.pid == this.getStatus().pid && [ProcessState.FINISHED, ProcessState.EXHAUSTED].includes(this.status)) {
          abortTimers.abort()
          this.pup.events.off('process_status_changed', onFinish)
          resolve(true)
        }
      }
      this.pup.events.on('process_status_changed', onFinish)
    })

    return await finished
  }

  /**
   * Kills the current runner and performs cleanup.
   * @param {string} reason - The reason for killing the runner.
   * @returns {boolean} - Returns true if the runner was killed successfully, false otherwise.
   */
  private killRunner = (reason: string): boolean => {
    if (this.runner) {
      this.runner.kill()
      this.pup.logger.log("stop", `Process stopped, reason: ${reason}`, this.config)
      this.setStatus(ProcessState.STOPPING)
      this.restarts = 0
      return true
    }
    return false
  }

  /**
   * Restarts the process.
   * @param {string} reason - The reason for restarting the process.
   */
  public restart = (reason: string) => {
    this.stop(reason)
    this.pendingRestartReason = reason
  }

  /**
   * Blocks the process.
   * @param {string} reason - The reason for blocking the process.
   */
  public block = (reason: string) => {
    this.blocked = true
    this.pup.logger.log("block", `Process blocked, reason: ${reason}`, this.config)
  }

  /**
   * Unblocks the process.
   * @param {string} reason - The reason for unblocking the process.
   */
  public unblock = (reason: string) => {
    this.blocked = false
    this.pup.logger.log("unblock", `Process unblocked, reason: ${reason}`, this.config)
  }

  private setupCron = () => {
    try {
      // ToDo: Take care of env TZ?
      const cronJob = new Cron(this.config.cron as string, { unref: true }, () => {
        this.start("Cron pattern")
        this.pup.logger.log("scheduler", `${this.config.id} is scheduled to run at '${this.config.cron} (${cronJob.nextRun()?.toLocaleString()})'`)
        this.pup.events.emit("process_scheduled", {
          next: this.cronJob?.nextRun(),
          status: this.getStatus(),
        })
        this.restarts = 0
      })

      // Initial next run time
      this.pup.logger.log("scheduler", `${this.config.id} is scheduled to run at '${this.config.cron} (${cronJob.nextRun()?.toLocaleString()})'`)
      this.pup.events.emit("process_scheduled", {
        next: this.cronJob?.nextRun(),
        status: this.getStatus(),
      })

      // Initial next
      this.cronJob = cronJob
    } catch (e) {
      this.pup.logger.error("scheduled", `Fatal error setup up the cron job for '${this.config.id}', process will not autostart. Error: ${e}`)
    }
  }

  private setupCronTerminate = () => {
    try {
      // ToDo: Take care of env TZ?
      const cronTerminateJob = new Cron(this.config.terminate as string, { unref: true }, () => {
        this.stop("Cron termination")

        this.pup.logger.log("scheduler", `${this.config.id} is scheduled to terminate at '${this.config.terminate} (${cronTerminateJob.nextRun()?.toLocaleString()})'`)
        this.pup.events.emit("process_scheduled_terminate", {
          next: this.cronTerminateJob?.nextRun(),
          status: this.getStatus(),
        })
        this.restarts = 0
      })

      // Initial next run time
      this.pup.logger.log("scheduler", `${this.config.id} is scheduled to terminate at '${this.config.terminate} (${cronTerminateJob.nextRun()?.toLocaleString()})'`)
      this.pup.events.emit("process_scheduled_terminate", {
        next: this.cronTerminateJob?.nextRun(),
        status: this.getStatus(),
      })

      // Initial next
      this.cronTerminateJob = cronTerminateJob
    } catch (e) {
      this.pup.logger.error("scheduled", `Fatal error setup up the termination cron job for '${this.config.id}', process will not terminate on a schedule. Error: ${e}`)
    }
  }

  private setupWatch = async (paths: string[]) => {
    const config = this.pup.configuration.watcher
    const watcher = new Watcher({ ...config, paths })
    for await (const watchEvent of watcher) {
      if (watchEvent.some((_) => _.type.includes("modify"))) {
        this.pup.logger.log("watcher", "File change detected", this.config)
        this.pup.events.emit("process_watch", {
          at: new Date(),
          status: this.getStatus(),
        })
        this.restarts = 0
        this.stop("restart")
        // Restart will be handled by watchdog
      }
    }
  }

  public isPendingRestart = () => this.pendingRestartReason !== undefined

  public cleanup = () => {}
}

export { Process, ProcessState }
export type { ProcessInformation, ProcessScheduledEvent, ProcessStateChangedEvent, ProcessWatchEvent }
