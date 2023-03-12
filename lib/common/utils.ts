async function fileExists(filePath: string) {
  try {
    const statResult = await Deno.stat(filePath)
    if (statResult.isFile) {
      return true
    } else {
      return false
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return false
    } else {
      throw e
    }
  }
}

function isRunning(pid: number, heartbeat: Date, thresholdMs: number): string {
  try {
    Deno.kill(pid, "SIGURG")
    return "Running"
  } catch (e) {
    if (e.name === "TypeError" || e.name === "PermissionDenied") {
      if (heartbeat) {
        return (new Date().getTime() - heartbeat.getTime()) < thresholdMs ? "Running" : "Unknown"
      } else {
        return "Not running"
      }
    } else {
      return "Exited"
    }
  }
}

export { fileExists, isRunning }
