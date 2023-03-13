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

**Remove the demo container**

Run `docker stop pup-demo` and `docker rm pup-demo`