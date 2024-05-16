/**
 * Everything related to class `Process`, which is the internal representation of a process in Pup
 *
 * @file      lib/core/process.ts
 * @license   MIT
 */

import type { Pup } from "./pup.ts"
import { Runner } from "./runner.ts"
import { WorkerRunner } from "./worker.ts"
import type { ProcessConfiguration } from "./configuration.ts"
import { Watcher } from "./watcher.ts"
import type { ApiTelemetryData } from "@pup/api-definitions"

import { Cron } from "@hexagon/croner"
import { delay } from "@std/async"

import { ApiProcessState } from "@pup/api-definitions"
import { CurrentOS, OperatingSystem } from "@cross/runtime"

interface ProcessStateChangedEvent {
  old?: ApiProcessState
  new?: ApiProcessState
  status: ProcessInformation
}

interface ProcessScheduledEvent {
  next?: ApiProcessState
  status: ProcessInformation
}

interface ProcessWatchEvent {
  at: Date
  status: ProcessInformation
}

interface ProcessInformation {
  id: string
  status: ApiProcessState
  code?: number
  signal?: string
  pid?: number
  started?: Date
  exited?: Date
  blocked?: boolean
  restarts?: number
  updated: Date
  pendingRestartReason?: string
  telemetry?: ApiTelemetryData
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
  private status: ApiProcessState = ApiProcessState.CREATED
  private pid?: number
  private code?: number
  private signal?: string
  private started?: Date
  private exited?: Date
  private restarts = 0
  private updated: Date = new Date()
  private pendingRestartReason?: string
  private telemetry?: ApiTelemetryData
  private watcher?: Watcher

  constructor(pup: Pup, config: ProcessConfiguration) {
    this.config = config
    this.pup = pup
  }

  public setTelemetry(t: ApiTelemetryData) {
    this.telemetry = t
  }

  private setStatus(s: ApiProcessState) {
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

  public isCluster(): boolean {
    return false
  }

  public getConfig(): ProcessConfiguration {
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
    if (this.status === ApiProcessState.RUNNING && !this.config.overrun) {
      logger.log("blocked", `Process still running, refusing to start`, this.config)
      return
    }

    // Do not restart if maximum number of restarts are exhausted and reason is restart
    if (this.restarts >= (this.config.restartLimit ?? Infinity) && restart) {
      logger.log("exhausted", `Maximum number of starts exhausted, refusing to start`, this.config)
      this.setStatus(ApiProcessState.EXHAUSTED)
      return
    }

    logger.log("starting", `Process starting, reason: ${reason}`, this.config)

    // Update status
    this.setStatus(ApiProcessState.STARTING)
    this.pid = undefined
    this.code = undefined
    this.signal = undefined
    this.exited = undefined
    this.started = undefined
    this.telemetry = undefined

    // Start watching
    if (this.config.watch) this.setupWatch(this.config.watch)

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
        this.setStatus(ApiProcessState.RUNNING)
        this.pid = pid
        this.started = new Date()
      })

      this.code = result.code
      this.signal = result.signal as string

      /**
       * Exited - Update status
       */
      if (result.code === 0) {
        this.setStatus(ApiProcessState.FINISHED)
        logger.log("finished", `Process finished with code ${result.code}`, this.config)

        /**
         * Forcefully stopped
         */
      } else if (result.code === 124) {
        this.setStatus(ApiProcessState.FINISHED)
        logger.log("finished", `Process manually stopped with code ${result.code}`, this.config)

        /**
         * Exited - Update status
         *
         * Treat all exit codes except 0 as errors
         */
      } else {
        this.setStatus(ApiProcessState.ERRORED)
        logger.log("errored", `Process exited with code ${result.code}`, this.config)
      }
    } catch (e) {
      this.code = 1
      this.signal = undefined
      this.setStatus(ApiProcessState.ERRORED)
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
    // Stop the watcher
    if (this.watcher) {
      this.watcher.stop()
    }

    if (!this.runner) {
      return false
    }

    this.setStatus(ApiProcessState.STOPPING)
    const abortTimers = new AbortController()

    // Stop process after `terminateGracePeriod`
    // - delay is blocking
    const graceDelayOptions = {
      signal: abortTimers.signal,
      persistent: true,
    }
    delay((this.config.terminateGracePeriod ?? this.pup.configuration.terminateGracePeriod ?? 0) * 1000, graceDelayOptions).then(() => {
      if (CurrentOS == OperatingSystem.Windows) {
        // On Windows, SIGTERM kills the process because Windows can't handle signals without cumbersome workarounds: https://stackoverflow.com/questions/35772001/how-to-handle-a-signal-sigint-on-a-windows-os-machine#35792192
        this.pup.logger.log("stopping", `Killing process, reason: ${reason}`, this.config)
      } else {
        this.pup.logger.log("stopping", `Stopping process, reason: ${reason}`, this.config)
      }
      return this.killRunner(reason, "SIGTERM")
    }).catch(() => false)

    // Kill process after `terminateTimeout`
    // - delay is non-blocking
    const terminateDelayOptions = {
      signal: abortTimers.signal,
      persistent: false,
    }
    delay((this.config.terminateTimeout ?? this.pup.configuration.terminateTimeout ?? 30) * 1000, terminateDelayOptions).then(() => {
      this.pup.logger.log("stopping", `Killing process, reason: ${reason}`, this.config)
      return this.killRunner(reason, "SIGKILL")
    }).catch(() => false)

    const finished = new Promise<boolean>((resolve) => {
      // Using `any` because event payload is not typed yet
      // deno-lint-ignore no-explicit-any
      const onFinish = (ev: any) => {
        if (ev.status?.pid == this.getStatus().pid && [ApiProcessState.FINISHED, ApiProcessState.EXHAUSTED, ApiProcessState.ERRORED].includes(this.status)) {
          abortTimers.abort()
          this.pup.events.off("process_status_changed", onFinish)
          // ToDo, resolve to whatever `killRunner()` returns, which is currently unavailable inside the `process_status_changed` event, so it's fixed to `true` by now
          resolve(true)
        }
      }
      this.pup.events.on("process_status_changed", onFinish)
    })

    return await finished
  }

  /**
   * Kills the current runner and performs cleanup.
   * @param {string} reason - The reason for killing the runner.
   * @param {Deno.Signal} signal - Signal to be sent to the process.
   * @returns {boolean} - Returns true if the runner was killed successfully, false otherwise.
   */
  private killRunner = (reason: string, signal: Deno.Signal = "SIGTERM"): boolean => {
    if (this.runner) {
      this.runner.kill(signal)
      this.pup.logger.log("stop", `Process stopped, reason: ${reason}`, this.config)
      this.setStatus(ApiProcessState.STOPPING)
      this.restarts = 0
      return true
    }
    return false
  }

  /**
   * Stops the process.
   * @param {string} reason - The reason for stopping the process.
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
    this.watcher = new Watcher({ ...config, paths })
    for await (const watchEvent of this.watcher) {
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

export { ApiProcessState, Process }
export type { ProcessInformation, ProcessScheduledEvent, ProcessStateChangedEvent, ProcessWatchEvent }
