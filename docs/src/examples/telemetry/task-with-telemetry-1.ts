// See docs/examples/telemetry/README.md for full documentation on telemetry, including using the IPC
import { PupTelemetry } from "../../../telemetry.ts"
const telemetry = new PupTelemetry(1)

// The task
let i = 0
console.log("Task running")

// Send data every 5th second
setInterval(() => {
  i += 1
  telemetry.emit("task-2", "message", `${Deno.env.get("PUP_PROCESS_ID")} sending "Hello" to 'task-2', iteration ${i}`)
}, 2000)
