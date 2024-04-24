---
title: "Telemetry"
parent: Usage
nav_order: 6
---

# Telemetry

---

### Getting started

This example demonstrates the telemetry feature of pup, which ...

- Automatically report process metrics, such as memory usage, back to Pup.
- Opens a channel for managed processes to communicate using a slow polling IPC
  mechanism.

The simplest use case, where you only want to monitor your client metrics is
used like this:

```ts
import { PupTelemetry } from "jsr:@pup/telemetry";

new PupTelemetry();

// The rest of your application
```

This will make your process report memory usage and current working directory
back to the Pup main process, no further configuration needed. Now you can see
memory usage for all processes running telemetry (including main process) using
`status` on the cli.

**To use the IPC mechanism:**

```ts
// PupTelemetry is a singleton, so it can be imported one or many times in your application
// - Installation instructions for different runtimes available at https://jsr.io/@pup/telemetry
// This example imports directly from jsr.io using Deno jsr:-specifier
import { PupTelemetry } from "jsr:@pup/telemetry";
const telemetry = new PupTelemetry();

// One part of your application ...

// Listen for ipc events
telemetry.on("my-event", (data) => {
  console.log(
    `Another process triggered 'my-event' with data ${JSON.stringify(data)}`,
  );
});

// Send ipc events
telemetry.emit("another-process-id", "my-event", { data: { to: "send" } });

// ... another part of your application
```

## Files

- [pup.json](https://github.com/Hexagon/pup/tree/main/docs/src/examples/telemetry/pup.json) -
  Pup configuration, sets up `task-with-telemetry.ts` to run forever.
  `server.ts` to be kept alive forever.
- [task-with-telemetry-1.ts](https://github.com/Hexagon/pup/tree/main/docs/src/examples/telemetry/task-with-telemetry-1.ts) -
  "task-1", script sending telemetry data to main process, and sending messages
  over IPC to task-2
- [task-with-telemetry-2.ts](https://github.com/Hexagon/pup/tree/main/docs/src/examples/telemetry/task-with-telemetry-2.ts) -
  "task-2", script sending telemetry data to main process, and receiving
  messages over IPC from task-1

## Running

`cd` to `docs/examples/telemetry` directory.

Start example by running `pup run` if pup is installed, or something like
`deno run -A ../../../pup.ts run` if not.

Now open another terminal and issue `pup status`, a brief overview of current
status is shown, including memory usage.

Success!
