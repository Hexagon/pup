# Pup docker demo

This demo runs a Deno script in the official Deno docker image periodically using Pup process manager

## Files

*  **Dockerfile** - Sets up a container based on `denoland/deno:debian-1.31.1`, installs Pup, and copies this directory content to `/app/`
*  **pup.jsonc** - Pup configuration, setting up `task.ts` to run at schedule `0/5 * * * * *` (every fifth second).
*  **task.ts** - The actual script to run. Prints "Task running" to console and exits.

## Building

`cd` to this directory.

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

**Remove the demo container**

Run `docker stop pup-demo` and `docker rm pup-demo`