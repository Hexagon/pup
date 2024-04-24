// See docs/examples/telemetry/README.md for full documentation on telemetry, including using the IPC
// - Pin this to the latest version of pup, or include in import map
import { PupTelemetry } from "jsr:@pup/telemetry";
const telemetry = new PupTelemetry(1);

// The task
let i = 0;
console.log("Task running");

// Send data every 5th second
setInterval(() => {
  i += 1;
  telemetry.emit(
    "task-2",
    "message",
    `${
      Deno.env.get("PUP_PROCESS_ID")
    } sending "Hello" to 'task-2', iteration ${i}`,
  );
}, 2000);
