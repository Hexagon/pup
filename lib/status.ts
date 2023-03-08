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

const taskRegistry: TaskList = {}

let globalLastUpdate: string | undefined = undefined

let statusFileName: string | undefined

function writeToDisk() {
  if (statusFileName) {
    const pupStatus = {
      pid: Deno.pid,
      heartbeat: globalLastUpdate,
      taskRegistry,
    }
    const result = new TextEncoder().encode(JSON.stringify(pupStatus))
    try {
      Deno.writeFile(statusFileName, result)
    } catch (_e) {
      console.error("Error while writing status to disk.")
    }
  }
  heartBeat()
}

function update(taskName: string) {
  const lastUpdate = new Date()
  taskRegistry[taskName] = { ...taskRegistry[taskName], lastUpdate: lastUpdate.toISOString() }
  if (!globalLastUpdate || (lastUpdate.getTime() - Date.parse(globalLastUpdate)) > 1000) {
    writeToDisk()
  }
}

export function heartBeat() {
  globalLastUpdate = new Date().toISOString()
}

export function lastHeartBeat() {
  return globalLastUpdate
}

export function resetTask(taskName: string): void {
  taskRegistry[taskName] = { name: taskName }
}

export function updatePid(taskName: string, pid: number): void {
  taskRegistry[taskName] = { ...taskRegistry[taskName], pid }
  update(taskName)
}

export function updateLastStdout(taskName: string, lastStdout: string): void {
  taskRegistry[taskName] = { ...taskRegistry[taskName], lastStdout }
  update(taskName)
}

export function updateLastStderr(taskName: string, lastStderr: string): void {
  taskRegistry[taskName] = { ...taskRegistry[taskName], lastStderr }
  update(taskName)
}

export function updateStarted(taskName: string, started: Date): void {
  taskRegistry[taskName] = { ...taskRegistry[taskName], started: started.toISOString() }
  update(taskName)
}

export function updateExited(taskName: string, exited: Date): void {
  taskRegistry[taskName] = { ...taskRegistry[taskName], exited: exited.toISOString() }
  update(taskName)
}

export function updateExitCode(taskName: string, exitCode: number): void {
  taskRegistry[taskName] = { ...taskRegistry[taskName], exitCode }
  update(taskName)
}

export function updateSignal(taskName: string, signal: number): void {
  taskRegistry[taskName] = { ...taskRegistry[taskName], signal }
  update(taskName)
}

export function getTaskInfo(taskName: string): TaskInfo {
  return taskRegistry[taskName] || {}
}

export function getTaskList() {
  return taskRegistry
}

export function setFileName(fileName?: string) {
  if (fileName) {
    statusFileName = fileName
  }
}

export type { TaskInfo }
