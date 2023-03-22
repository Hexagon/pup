---
layout: page
title: "Example: Telemetry"
---

# Example: Telemetry

---

### Getting started

This example demonstrates the telemetry feature of pup, where a small script in your client processes report status, such as memory usage, back to Pup.

To use this feature, add the following lines at the entrypoint of your project

```ts
import { PupTelemetry } from "https://deno.land/x/pup/telemetry.ts" // Pin this to a specific version of pup
PupTelemetry()

// The rest of your application
```

This will make your process report memory usage and current working directory back to the Pup main process, no further configuration needed.

You can then display memory usage for all running processes (including main process) using `--status` con the cli, or through the web interface.

## Files

- [pup.json](https://github.com/Hexagon/pup/tree/main/docs/examples/telemetry/pup.json) - Pup configuration, sets up `task-with-telemetry.ts` to run forever. `server.ts` to be kept alive forever.
- [task-with-telemetry.ts](https://github.com/Hexagon/pup/tree/main/docs/examples/telemetry/task-with-telemetry.ts.ts) - The actual script to run, which include the pup telemetry client.

## Running

`cd` to `/docs/examples/telemetry` directory.

Start example by running `pup` if pup is installed, or something like `deno run -A ../../../pup.ts` if not.

Now open another terminal and issue `pup --status`, a brief overview of current status is shown, including memory usage.

Success!
