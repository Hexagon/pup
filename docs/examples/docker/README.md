---
layout: page
title: "Appendix: Docker (Deno)"
---

# Example: Using pup with Docker

The example at [/docs/examples/docker](https://github.com/Hexagon/pup/tree/main/docs/examples/watcher) runs a Deno script periodically with Pup in the official Deno docker imag.

## Files

- [Dockerfile](https://github.com/Hexagon/pup/tree/main/docs/examples/watcher/Dockerfile) - Sets up a container based on `denoland/deno:debian-1.31.1`, installs Pup, and copies this directory content to `/app/`
- [pup.jsonc](https://github.com/Hexagon/pup/tree/main/docs/examples/watcher/pup.jsonc) - Pup configuration, sets up `task.ts` to run at cron schedule `0/5 * * * * *` (every fifth second).
- [task.ts](https://github.com/Hexagon/pup/tree/main/docs/examples/watcher/task.ts) - The actual script to run. Prints "Task running" to console and exits.

## Building and running

`cd` to `/docs/examples/docker` directory.

**Build image**

Run `docker build . --tag=pup-docker-demo`

**Run image**

Run `docker run -d --name="pup-demo" pup-docker-demo`

**Check logs to verify everything is working**

Run `docker logs pup-demo`

```
[3/13/2023, 10:41:33 PM][core][scheduler] periodic-task-demo is scheduled to run at '0/5 * * * * * (3/13/2023, 10:41:35 PM)'
[3/13/2023, 10:41:35 PM][periodic-task-demo][starting] Process starting, reason: Cron pattern
[3/13/2023, 10:41:35 PM][core][scheduler] periodic-task-demo is scheduled to run at '0/5 * * * * * (3/13/2023, 10:41:40 PM)'
[3/13/2023, 10:41:35 PM][periodic-task-demo][stdout] Periodic task running
[3/13/2023, 10:41:35 PM][periodic-task-demo][finished] Process finished with code 0
[3/13/2023, 10:41:40 PM][periodic-task-demo][starting] Process starting, reason: Cron pattern
[3/13/2023, 10:41:40 PM][core][scheduler] periodic-task-demo is scheduled to run at '0/5 * * * * * (3/13/2023, 10:41:45 PM)'
[3/13/2023, 10:41:40 PM][periodic-task-demo][stdout] Periodic task running
[3/13/2023, 10:41:40 PM][periodic-task-demo][finished] Process finished with code 0
```

Success!

**Remove the demo from docker**

Run `docker stop pup-demo`, `docker rm pup-demo` `docker rmi pup-docker-demo`
