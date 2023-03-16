---
layout: page
title: "Appendix: File watcher example"
---

# Example: Restart on file changes

The example at [/docs/examples/watcher](https://github.com/hexagon/pup/docs/examples/watcher) runs `script.js` with Deno using Pup. The process is restarted on any file change in the current directory (configuration `watch: ["."]`).

## Files

- [pup.jsonc](./pup.jsonc) - Pup configuration, sets up `script.js` to run forever, and restart when a file in the current directory changes.
- [script.js](./script.js) - The actual script to run. Prints "Script running (for about an hour, if nothing else happens)..."

## Running

`cd` to `/docs/examples/watcher` directory.

Start example by running `pup` if pup is installed, pup will automatically pick up the configuration in`pup.jsonc`.

Run something like `deno run -A ../../../pup.ts` if pup is not installed globally.

Success!
