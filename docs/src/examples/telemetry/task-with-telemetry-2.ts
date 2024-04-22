// See docs/examples/telemetry/README.md for full documentation on telemetry, including using the IPC
// - Pin this to the latest version of pup, or include in import map
import { PupTelemetry } from "jsr:@pup/pup@1.0.0-rc.30/telemetry"
const telemetry = new PupTelemetry(1)

// The task
console.log("Process running")

// Receive data
// deno-lint-ignore no-explicit-any
telemetry.on("message", (data: any) => {
  console.log(`task-2 received: ${data}`)
})

// Wait 5 minutes
setTimeout(() => {
  console.log("Done!")
}, 300_000)
