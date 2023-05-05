---
layout: page
title: "Example: Kept-alive Worker Server"
---

# Example: Kept-alive Worker Server

---

The example at [/docs/examples/kept-alive-worker-server](https://github.com/Hexagon/pup/tree/main/docs/examples/worker) runs a Deno server script as a continuously monitored and restarted process
using a worker. The process has logging configurations to write logs to separate files.

## Files

- [pup.jsonc](https://github.com/Hexagon/pup/tree/main/docs/examples/worker/pup.jsonc) - Pup configuration, sets up `server.js` to be kept alive forever and restarts with a 10 seconds delay.
- [server.js](https://github.com/Hexagon/pup/tree/main/docs/examples/worker/server.js) - Worker server script that runs an HTTP server. It sends log messages and exit signals through the logger
  facility.

## Running

`cd` to `/docs/examples/worker` directory.

Start example by running `pup run` if pup is installed, or something like `deno run -A ../../../pup.ts run` if not.

Success!

## Using Worker Mode Instead of Process Mode

In this example, we are running the server script as a worker instead of a separate process. Using worker mode has some advantages over process mode:

1. **Performance**: Workers run in the same process as the main script, allowing for faster communication between the main thread and the worker. This can lead to performance improvements, as it
   reduces the overhead of inter-process communication (IPC).

2. **Resource Management**: Workers share the same resources as the main process, which can be more efficient in terms of memory usage and CPU time. This is particularly beneficial for applications
   that require frequent communication between the main thread and the worker, as they can leverage shared memory and avoid the cost of serialization and deserialization.

3. **Simplified Error Handling**: In worker mode, errors can be more easily caught and handled within the same context. This can simplify error handling, especially when compared to managing errors
   across multiple processes.

However, it's important to note that using worker mode may not be suitable for all use cases. One key trade-off is that workers run in the same process and share the same memory space, so an unhandled
error in a worker could potentially crash the entire process. Additionally, workers are subject to the same JavaScript single-threaded limitations, so heavy CPU-bound tasks may still cause the main
thread to become unresponsive.

In summary, worker mode can be a more efficient and easier-to-manage alternative to process mode in certain scenarios, but it's essential to carefully consider the specific requirements and
constraints of your application when making this choice.
