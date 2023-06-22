---
layout: page
title: "Example: Enabling the web interface"
---

# Example: Web interface

---

The example at [/docs/examples/basic-webinterface](https://github.com/Hexagon/pup/tree/main/docs/examples/basic-webinterface) borrows the server.ts and task.ts from the basic example. Both processes
have logging configurations, with the second process having custom logger settings which enable the periodic process to write its logs to separate files.

The web interface plugin is enabled by `pup.jsonc` and available at <http://localhost:5000/>

## Example Files

- [pup.jsonc](https://github.com/Hexagon/pup/tree/main/docs/examples/basic/pup.jsonc) - Pup configuration, sets up `task.ts` to run at cron schedule `0/20 * * * * *` (every fifth second), and enables
  web interface.

## Configuring

To activate the web interface plugin, set up the `plugins:`-section of your `pup.json` like this:

```jsonc
{
  "processes": [/* ... */],
  "plugins": [
    {
      "url": "https://deno.land/x/pup@$VERSION/plugins/web-interface/mod.ts",
      "options": {
        "port": 5000
      }
    }
  ]
}
```

If running pup using the normal release channels `stable` or `prerelease`, `$VERSION` will be replaced by the version of the currently running pup instance. If running a `canary` version, or custom
intallation, you **can not** use the `$VERSION` variable, and should give an absolute url.

## Running the example

`cd` to `/docs/examples/basic-webinterface` directory.

Start example by running `pup run` if pup is installed, or something like `deno run -A ../../../pup.ts run` if not.

Browse to <http://localhost:5000/>

Success!
