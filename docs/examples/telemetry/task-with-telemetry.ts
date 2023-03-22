import { PupTelemetry } from "../../../telemetry.ts"
PupTelemetry()

console.log("Process running")

// Wait 5 minutes
setTimeout(() => {
  console.log("Done!")
}, 300_000)
