---
layout: page
title: "Example: Enabling the web interface"
---

# Example: Web interface (WORK IN PROGRESS!)

---

The example at [/docs/examples/basic-webinterface](https://github.com/Hexagon/pup/tree/main/docs/examples/basic-webinterface) borrows the server.ts and task.ts from the basic example. Both processes
have logging configurations, with the second process having custom logger settings which enable the periodic process to write its logs to separate files.

The **work-in-progress** web interface plugin is enabled and available at <http://localhost:5000/>

## Files

- [pup.jsonc](https://github.com/Hexagon/pup/tree/main/docs/examples/basic/pup.jsonc) - Pup configuration, sets up `task.ts` to run at cron schedule `0/20 * * * * *` (every fifth second), and

## Running

`cd` to `/docs/examples/basic-webinterface` directory.

Start example by running `pup` if pup is installed, or something like `deno run -A ../../../pup.ts` if not.

Browse to <http://localhost:5000/>

Success!
