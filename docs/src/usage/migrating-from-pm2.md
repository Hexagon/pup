---
title: "Migrating from PM2"
parent: Usage
nav_order: 7
---

# Migrating from PM2

Pup can manage Node.js applications as well as Deno programs. The main change when moving from PM2 is that Pup keeps process definitions in a `pup.json` or `pup.jsonc` file and runs them as a named instance.

## Convert an ecosystem file

A PM2 ecosystem entry like this:

```js
module.exports = {
  apps: [{
    name: "api",
    script: "./dist/server.js",
    cwd: "/srv/api",
    watch: false,
    env: { NODE_ENV: "production" },
  }],
}
```

can be represented in `pup.json` as:

```json
{
  "name": "api",
  "processes": [
    {
      "id": "api",
      "cmd": "node ./dist/server.js",
      "cwd": "/srv/api",
      "env": { "NODE_ENV": "production" },
      "autostart": true,
      "restart": "always"
    }
  ]
}
```

Use the command you would normally run for `script`, including any runtime flags. Omit `watch` when you do not want file watching; when enabled in Pup, `watch` takes an array of paths. Pup's `restart` accepts `"always"` or `"error"`.

## Start and control the instance

From the directory containing `pup.json`, validate and run the configuration in the foreground:

```sh
pup run
```

For a background service that starts at boot, install the instance with:

```sh
pup enable-service
```

Then use the process ID from the configuration to control it and inspect logs:

```sh
pup restart api
pup stop api
pup logs --id api
pup monitor --id api
```

`pup enable-service` installs a Pup instance as an operating-system service. It replaces the service setup step, while the `pup.json` file replaces PM2's saved process list. See [Run at boot](service.md) for service options.

## Clustering

PM2's `instances` option does not map directly to an automatically detected CPU count. Pup supports an explicit `cluster.instances` count and can pass each process a distinct port using `cluster.startPort`; the application must read `PUP_CLUSTER_PORT` and listen on that port. See [Scaling](scaling.md) before moving a clustered PM2 application.

Review the [configuration reference](configuration.md) for options that do not have a direct PM2 equivalent.
