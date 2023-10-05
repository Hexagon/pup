// See docs/examples/telemetry/README.md for full documentation on telemetry, including using the IPC
import { PupTelemetry } from "../../../telemetry.ts"
const telemetry = new PupTelemetry(1)

// The task
console.log("Process running")

// Receive data
telemetry.on("message", (data) => {
  console.log(`task-2 received: ${data}`)
})

// Wait 5 minutes
setTimeout(() => {
  console.log("Done!")
}, 300_000)
