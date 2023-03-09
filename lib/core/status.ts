interface TaskInfo {
  name: string
  pid?: number
  lastStdout?: string
  lastStderr?: string
  started?: string
  exited?: string
  exitCode?: number
  signal?: number
  lastUpdate?: string
}

type TaskList = Record<string, TaskInfo>

class Status {
  /* Keeps track of the status of individual processes */
  private taskRegistry: TaskList = {}

  /* Keeps track of the last sign of life */
  private lastHeartBeat: Date = new Date()

  /* Properties related to disk write */
  private lastWrite: Date = new Date()
  private statusFileName?: string
  private writeInterval = 1000

  constructor(fileName?: string, writeInterval?: number) {
    if (fileName) {
      this.statusFileName = fileName
    }
    if (writeInterval !== undefined) {
      this.writeInterval = writeInterval
    }
  }

  /* Internal methods */
  private writeToDisk() {
    if (this.statusFileName && new Date().getTime() - this.lastWrite.getTime() > this.writeInterval) {
      // Prepare the object to write
      const pupStatus = {
        pid: Deno.pid,
        heartbeat: this.lastHeartBeat,
        taskRegistry: this.taskRegistry,
      }
      const result = new TextEncoder().encode(JSON.stringify(pupStatus))

      // Try to write to disk
      try {
        Deno.writeFile(this.statusFileName, result)
      } catch (_e) {
        console.error("Error while writing status to disk.")
      }

      // Update write status
      this.lastWrite = new Date()
    }
  }

  private update(taskName: string) {
    // Update heartbeat
    this.updateHeartBeat()

    // Update lastUpdate
    this.taskRegistry[taskName] = { ...this.taskRegistry[taskName], lastUpdate: new Date().toISOString() }

    // Request disk write
    this.writeToDisk()
  }

  /* Manage tasks */
  public resetTask(taskName: string): void {
    this.taskRegistry[taskName] = { name: taskName }
  }

  public updatePid(taskName: string, pid: number): void {
    this.taskRegistry[taskName] = { ...this.taskRegistry[taskName], pid }
    this.update(taskName)
  }

  public updateLastStdout(taskName: string, lastStdout: string): void {
    this.taskRegistry[taskName] = { ...this.taskRegistry[taskName], lastStdout }
    this.update(taskName)
  }

  public updateLastStderr(taskName: string, lastStderr: string): void {
    this.taskRegistry[taskName] = { ...this.taskRegistry[taskName], lastStderr }
    this.update(taskName)
  }

  public updateStarted(taskName: string, started: Date): void {
    this.taskRegistry[taskName] = { ...this.taskRegistry[taskName], started: started.toISOString() }
    this.update(taskName)
  }

  public updateExited(taskName: string, exited: Date): void {
    this.taskRegistry[taskName] = { ...this.taskRegistry[taskName], exited: exited.toISOString() }
    this.update(taskName)
  }

  public updateExitCode(taskName: string, exitCode: number): void {
    this.taskRegistry[taskName] = { ...this.taskRegistry[taskName], exitCode }
    this.update(taskName)
  }

  public updateSignal(taskName: string, signal: number | undefined): void {
    this.taskRegistry[taskName] = { ...this.taskRegistry[taskName], signal }
    this.update(taskName)
  }

  public getTaskList() {
    return this.taskRegistry
  }

  /* Manage heart beat */
  public updateHeartBeat() {
    this.lastHeartBeat = new Date()
  }

  public getHeartBeat() {
    return this.lastHeartBeat
  }
}

export { Status }
export type { TaskInfo }
