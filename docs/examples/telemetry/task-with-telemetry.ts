// See docs/examples/telemetry/README.md for full documentation on telemetry, including using the IPC

import { PupTelemetry } from "../../../telemetry.ts"
new PupTelemetry()

console.log("Process running")

// Wait 5 minutes
setTimeout(() => {
  console.log("Done!")
}, 300_000)
