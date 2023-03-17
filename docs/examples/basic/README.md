---
layout: page
title: "Appendix: Server w/ cron task"
---

# Example: Server with periodical (cron) task

The example at [/docs/examples/basic](https://github.com/Hexagon/pup/tree/main/docs/examples/basic) runs a Deno server script as a continuously monitored and restarted process, and a Deno task script executing
every 5 seconds based on a cron schedule. Both processes have logging configurations, with the second process having custom logger settings which enable the periodic process to write its logs to
separate files.

## Files

- [pup.jsonc](https://github.com/Hexagon/pup/tree/main/docs/examples/basic/pup.jsonc) - Pup configuration, sets up `task.ts` to run at cron schedule `0/20 * * * * *` (every fifth second), and `server.ts` to be kept alive forever.
- [task.ts](https://github.com/Hexagon/pup/tree/main/docs/examples/basic/task.ts) - The actual script to run. Prints "Task starting and working ...." to console, and fails randomly to demonstrate how restarts works.
- [server.ts](https://github.com/Hexagon/pup/tree/main/docs/examples/basic/task.ts) - Fake server, prints the value of env.TZ to demonstrate custom environment variables, runs for 10 seconds, then exists, to demonstrade restart behaviour.

## Running

`cd` to `/docs/examples/basic` directory.

Start example by running `pup` if pup is installed, or something like `deno run -A ../../../pup.ts` if not.

Success!
