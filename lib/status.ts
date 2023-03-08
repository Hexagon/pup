interface TaskInfo {
    pid?: number;
    lastStdout?: string;
    lastStderr?: string;
    started?: Date;
    exited?: Date;
    exitCode?: number;
    signal?: number;
    lastUpdate?: Date;
}

type TaskList = Record<string, TaskInfo>;

const taskRegistry: TaskList = {};

let globalLastUpdate : Date | undefined = undefined;

let statusFileName : string | undefined;

function writeToDisk() {
    if (statusFileName) {
        const result = new TextEncoder().encode(JSON.stringify(taskRegistry))
        Deno.writeFile(statusFileName, result)
    }
    globalLastUpdate = new Date()
}

function update(taskName: string) {
    const lastUpdate = new Date();
    taskRegistry[taskName] = { ...taskRegistry[taskName], lastUpdate };
    if (!globalLastUpdate || (lastUpdate.getTime() - globalLastUpdate.getTime()) > 1000) {
        writeToDisk();
    }
}

export function updatePid(taskName: string, pid: number): void {
    taskRegistry[taskName] = { ...taskRegistry[taskName], pid };
    update(taskName);
}

export function updateLastStdout(taskName: string, lastStdout: string): void {
    taskRegistry[taskName] = { ...taskRegistry[taskName], lastStdout };
    update(taskName);
}

export function updateLastStderr(taskName: string, lastStderr: string): void {
    taskRegistry[taskName] = { ...taskRegistry[taskName], lastStderr };
    update(taskName);
}

export function updateStarted(taskName: string, started: Date): void {
    taskRegistry[taskName] = { ...taskRegistry[taskName], started };
    update(taskName);
}

export function updateExited(taskName: string, exited: Date): void {
    taskRegistry[taskName] = { ...taskRegistry[taskName], exited };
    update(taskName);
}

export function updateExitCode(taskName: string, exitCode: number): void {
    taskRegistry[taskName] = { ...taskRegistry[taskName], exitCode };
    update(taskName);
}

export function updateSignal(taskName: string, signal: number): void {
    taskRegistry[taskName] = { ...taskRegistry[taskName], signal };
    update(taskName);
}

export function getTaskInfo(taskName: string): TaskInfo {
    return taskRegistry[taskName] || {};
}

export function getTaskList() {
    return taskRegistry;
}

export function setFileName(fileName?: string) {
    if (fileName) {
        statusFileName = fileName;
    }
}