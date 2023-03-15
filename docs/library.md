---
layout: page
title: Library usage
---

## Library usage

### Process Management

Pup provides several methods for managing processes:

- init(): Initializes the process. If a cron pattern is provided, the process will be scheduled accordingly. If the watch option is enabled, a watcher will be set up to monitor file changes.
- start(reason: string, restart?: boolean): Starts the process. If the process is already running and overrun is not enabled, the start request will be ignored. If the maximum number of restarts is
  reached, the process will not be restarted.
- stop(reason: string): Stops the process. If the process is not running, the stop request will be ignored.
- block(): Prevents the process from being started.
- unblock(): Allows the process to be started after it was previously blocked.
- To manage processes, first import the Process class from /lib/core/process.ts. Then, create a new instance of the Process class, providing a Pup instance and a ProcessConfiguration object:

```ts
import { Process } from "/lib/core/process.ts"
import { Pup } from "/lib/core/pup.ts"
import { ProcessConfiguration } from "/lib/core/configuration.ts"

const pup = new Pup()
const processConfig: ProcessConfiguration = {
  id: "example",
  cmd: ["deno", "run", "--allow-net", "app.ts"],
}

const process = new Process(pup, processConfig)
```

With the Process instance, you can now use the methods mentioned above to manage your process:

```ts
// Initialize and start the process
process.init()
process.start("Manual start")

// Stop the process after some time
setTimeout(() => {
  process.stop("Manual stop")
}, 10000)
```

### Monitoring Process Information

To monitor the status of your processes, use the getStatus() method provided by the Process class. This method returns an object containing process information, such as the process ID, status, exit
code, and start and exit times.

For example, you can log the status of a process like this:

```ts
const status = process.getStatus()
console.log(status)
```

By combining the various process management methods and monitoring techniques, you can build a powerful system for managing and monitoring your processes with Pup.

### Logging

Pup uses a custom logger to provide detailed logs about the processes being managed. You can configure the logger's behavior through the `logger` object in the configuration file.

There are two types of logger configurations: `GlobalLoggerConfiguration` and `ProcessLoggerConfiguration`. The global logger configuration applies to all processes managed, while the process logger
configuration can be used to override the global settings for a specific process.

Here's an example of how to configure logging for Pup:

```ts
const configuration: Configuration = {
  logger: {
    console: true, // Log to console
    colors: true, // Use colors in logs
    decorateFiles: true, // Decorate log files
  },
  processes: [
    {
      id: "example",
      cmd: ["deno", "run", "--allow-net", "app.ts"],
      logger: {
        console: false, // Override global setting and disable console logging for this process
      },
    },
  ],
}
```

### File Watching

Pup can watch for file changes and automatically restart processes when changes are detected. This can be helpful during development when you want to automatically restart your application when you
make changes to the source code.

To enable file watching, add a watch property to the ProcessConfiguration object:

```ts
const processConfig: ProcessConfiguration = {
  id: "example",
  cmd: ["deno", "run", "--allow-net", "app.ts"],
  watch: ["./src"], // Watch the "src" directory for changes
}
```

### Cron Scheduling

Pup supports scheduling processes to run at specific intervals using cron patterns. To set up a cron schedule for a process, add a cron property to the ProcessConfiguration object:

```ts
const processConfig: ProcessConfiguration = {
  id: "example",
  cmd: ["deno", "run", "--allow-net", "app.ts"],
  cron: "*/5 * * * *", // Run the process every 5 minutes
}
```

With these advanced features, you can further customize Pup's behavior to fit your needs and create a powerful process management system.
