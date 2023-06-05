/**
 * Everything related to class `Cluster`, which is the internal representation of a cluster in Pup
 *
 * `Cluster` is basically a collection of processes, also extending `Process` to support the exact same methods
 *
 * @file      lib/core/process.ts
 * @license   MIT
 */

import { Process, ProcessInformation, ProcessState } from "./process.ts"
import { ProcessConfiguration } from "./configuration.ts"
import { Pup } from "./pup.ts"
import { BalancingStrategy, LoadBalancer } from "./loadbalancer.ts"

class Cluster extends Process {
  public processes: Process[] = []
  public loadBalancer?: LoadBalancer

  constructor(pup: Pup, config: ProcessConfiguration) {
    super(pup, config)

    this.setInstances(this.config.cluster?.instances || 1)
  }

  public override start = async (reason?: string, restart?: boolean) => {
    await Promise.all(
      this.processes.map((process) => process.start(reason, restart)),
    )
  }

  public isCluster = (): boolean => {
    return true
  }

  public setInstances = (nInstances: number) => {
    const backends = []

    // ToDo: If there already are processes, reuse, stop or add
    this.processes = []

    for (let i = 0; i < nInstances; i++) {
      if (!this.config.cluster?.startPort) {
        throw new Error("startPort not defined in cluster configuration.")
      }

      // Create a modified configuration for the subprocess
      const modConfig = structuredClone(this.config)
      modConfig.id = `${this.config.id}-${i + 1}`
      modConfig.autostart = true
      modConfig.env = structuredClone(this.config.env || {})
      modConfig.env.PUP_CLUSTER_INSTANCE = i.toString()
      modConfig.env.PUP_CLUSTER_PORT = (this.config.cluster.startPort + i).toString()

      // Create the subprocess
      const process = new Process(this.pup, modConfig)
      this.processes.push(process)

      // Log
      this.pup.logger.log("cluster", `Sub-Process '${process.getConfig().id}' loaded`)

      // Add backend for load balancer
      backends.push({
        host: "127.0.0.1",
        port: (this.config.cluster.startPort + i),
      })
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

      this.loadBalancer = new LoadBalancer(this.pup, backends, strategy, 60)
      this.loadBalancer.start(this.config.cluster.commonPort)
    }
  }

  public override stop = (reason: string): boolean => {
    const results = this.processes.map((process) => process.stop(reason))
    return results.every((result) => result)
  }

  public override restart = (reason: string) => {
    this.processes.forEach((process) => process.restart(reason))
  }

  public override block = (reason: string) => {
    this.processes.forEach((process) => process.block(reason))
  }

  public override unblock = (reason: string) => {
    this.processes.forEach((process) => process.unblock(reason))
  }

  public getStatuses(): ProcessInformation[] {
    return this.processes.map((process) => process.getStatus())
  }

  public getStatus(): ProcessInformation {
    const clusterStatus: ProcessInformation = {
      id: this.getConfig().id,
      status: ProcessState.CREATED,
      updated: new Date(),
      type: "cluster",
    }

    const statuses = this.getStatuses()
    const allRunning = statuses.every((status) => status.status === ProcessState.RUNNING)
    const anyRunning = statuses.some((status) => status.status === ProcessState.RUNNING)

    if (allRunning) {
      clusterStatus.status = ProcessState.RUNNING
    } else if (anyRunning) {
      clusterStatus.status = ProcessState.STARTING
    }

    clusterStatus.updated = new Date()
    return clusterStatus
  }
}

export { Cluster }
