/**
 * Everything related to class `Cluster`, which is the internal representation of a cluster in Pup
 *
 * `Cluster` is basically a collection of processes, also extending `Process` to support the exact same methods
 *
 * @file      lib/core/cluster.ts
 * @license   MIT
 */

import { Process, type ProcessInformation } from "./process.ts"
import { ApiProcessState } from "@pup/api-definitions"
import { LOAD_BALANCER_DEFAULT_VALIDATION_INTERVAL_S, type ProcessConfiguration } from "./configuration.ts"
import type { Pup } from "./pup.ts"
import { BalancingStrategy, type LoadBalancerStartOperation } from "./loadbalancer.ts"

class Cluster extends Process {
  public processes: Process[] = []
  public loadBalancerWorker: Worker | null

  constructor(pup: Pup, config: ProcessConfiguration) {
    super(pup, config)

    this.loadBalancerWorker = null

    this.setInstances(this.config.cluster?.instances || 1)
  }

  public override start = async (reason?: string, restart?: boolean): Promise<void> => {
    await Promise.all(
      this.processes.map((process) => process.start(reason, restart)),
    )
  }

  public isCluster = (): boolean => {
    return true
  }

  public setInstances = (nInstances: number): void => {
    const backends = []

    // ToDo: If there already are processes, reuse, stop or add
    this.processes = []

    // Check start port if load balancer is activated
    if (this.config.cluster?.commonPort) {
      if (!this.config.cluster?.startPort) {
        throw new Error("startPort not defined in cluster configuration.")
      }
    }

    for (let i = 0; i < nInstances; i++) {
      // Create a modified configuration for the subprocess
      const modConfig = structuredClone(this.config)
      modConfig.id = `${this.config.id}-${i + 1}`
      modConfig.env = structuredClone(this.config.env || {})
      modConfig.env.PUP_CLUSTER_INSTANCE = i.toString()

      // Add PUP_CLUSTER_PORT only if load balancer is activated
      if (this.config.cluster?.commonPort && this.config.cluster.startPort) {
        modConfig.env.PUP_CLUSTER_PORT = (this.config.cluster.startPort + i).toString()
      }

      // Create the subprocess
      const process = new Process(this.pup, modConfig)
      this.processes.push(process)

      // Log
      this.pup.logger.log("cluster", `Sub-Process '${process.getConfig().id}' loaded`)

      // Add backend for load balancer
      if (this.config.cluster?.commonPort && this.config.cluster.startPort) {
        backends.push({
          host: "127.0.0.1",
          port: (this.config.cluster.startPort + i),
        })
      }
    }

    if (this.config.cluster?.commonPort) {
      let strategy: BalancingStrategy

      if (this.config.cluster.strategy === "ip-hash") {
        strategy = BalancingStrategy.IP_HASH
      } else if (this.config.cluster.strategy === "least-connections") {
        strategy = BalancingStrategy.LEAST_CONNECTIONS
      } else {
        strategy = BalancingStrategy.ROUND_ROBIN
      }

      this.pup.logger.log(
        "cluster",
        `Setting up load balancer for ${nInstances} instances with common port ${this.config.cluster.commonPort} and strategy ${BalancingStrategy[strategy]}`,
        this.config,
      )

      if (this.loadBalancerWorker !== null) {
        this.loadBalancerWorker.terminate()
      }

      const startOperation: LoadBalancerStartOperation = {
        operation: "start",
        backends,
        strategy,
        validationInterval: LOAD_BALANCER_DEFAULT_VALIDATION_INTERVAL_S,
        commonPort: this.config.cluster.commonPort,
      }

      this.loadBalancerWorker = new Worker(new URL("../workers/loadbalancer.js", import.meta.url).href, { type: "module" })

      // handle log messages from worker
      this.loadBalancerWorker.onmessage = (event) => {
        if (event.data && event.data.operation === "log") {
          const { severity, category, text } = event.data
          this.pup.logger.generic(severity, category, text)
        }
        if (event.data && event.data.operation === "ready") {
          this.loadBalancerWorker?.postMessage(startOperation)
        }
      }
    }
  }

  public override stop = (reason: string): Promise<boolean> => {
    const results = this.processes.map((process) => process.stop(reason))
    return Promise.allSettled(results).then((results) => results.every((result) => result))
  }

  public override restart = (reason: string): void => {
    this.processes.forEach((process) => process.restart(reason))
  }

  public override block = (reason: string): void => {
    this.processes.forEach((process) => process.block(reason))
  }

  public override unblock = (reason: string): void => {
    this.processes.forEach((process) => process.unblock(reason))
  }

  public getStatuses(): ProcessInformation[] {
    return this.processes.map((process) => process.getStatus())
  }

  public getStatus(): ProcessInformation {
    const clusterStatus: ProcessInformation = {
      id: this.getConfig().id,
      status: ApiProcessState.CREATED,
      blocked: false,
      updated: new Date(),
      type: "cluster",
    }

    // Extract the status values from each instance
    const statuses = this.getStatuses()

    // Adjust cluster status to match all children
    const statusValues = statuses.map((status) => status.status)
    const uniqueStatuses = new Set(statusValues)
    if (uniqueStatuses.size === 1) {
      // All instances have the same status
      clusterStatus.status = Array.from(uniqueStatuses)[0]
    } else {
      // Instances have varying statuses
      clusterStatus.status = ApiProcessState.MIXED
    }

    // Set blocked flag if all children are blocked
    const allBlocked = statuses.every((status) => status.blocked)
    if (allBlocked) {
      clusterStatus.blocked = true
    }

    clusterStatus.updated = new Date()

    return clusterStatus
  }

  public cleanup = (): void => {
    this.loadBalancerWorker?.terminate()
    this.loadBalancerWorker = null
  }
}

export { Cluster }
