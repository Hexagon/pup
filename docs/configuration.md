---
layout: page
title: " 4. Configuration"
---

# 4. Configuration

---

In this section, you will learn how to create and manage configuration files for Pup.

To create a minimal configuration file for Pup manually, first create a new file named `pup.json` in your project's root directory. You can also name it `pup.jsonc` if you want to use jsonc-style
comments.

Then, add the following basic configuration to the file:

```json
{
  "processes": [
    {
      "id": "example",
      "cmd": ["deno", "run", "--allow-net", "app.ts"],
      "autostart": true
    }
  ]
}
```

This defines a single process named example that runs a Deno script (app.ts) with the `--allow-net` flag. You can customize the configuration to suit your needs by adding more processes or updating
the existing process definition.

> **Note**: If you quickly want to scaffold a new configuration file, you can use the cli helpers `pup --init`, `--append`, and `--remove`. More on this at
> [Configuring using the cli](/usage.html#configuring-using-the-cli).

## Process configuration

Here's a list of available configuration options for each process:

**General**

- `id` (**required**): A unique identifier for the process.
- `cmd` (**required**): An array containing the command and its arguments to run the process.
- `cwd` (optional): The working directory for the process.
- `env` (optional): An object containing environment variables for the process.
- `path` (optional): Extra paths that will be **appended** to `PATH` for this process.
- `pidFile` (optional): The path to the file where the process ID (PID) will be stored.
- `timeout` (optional): A number specifying the maximum time (in seconds) that the process is allowed to run before it's terminated.
- `overrun` (optional): A boolean indicating whether a new instance of the process is allowed to start if the previous instance is still running. Default: false.

**Start policy**

You need to specify one of these for each process, else the process will never start.

- `autostart` (optional): A boolean indicating whether the process should start automatically when Pup starts. Default: false.
- `cron` (optional): A cron expression specifying the schedule for the process to run.
- `watch` (optional): An array of locations to watch for file changes. Process will start/restart when a file or directory changes.

**Restart policy**

- `restart` (optional): A string specifying when the process should be restarted. Allowed values: "always" or "error".
- `restartDelayMs` (optional): A number specifying the delay (in milliseconds) before restarting the process.
- `restartLimit` (optional): A number specifying the maximum number of restarts allowed for the process.

**Clustering**

- `cluster` (optional): An object specifying options to run this process in multiple instances, more on this at [6. Clusters and Load Balancer](/scaling.html)
  - `instances`: The number of instances to run using this configuration.
  - `startPort` (optional): A number specifying the port on which each instance should listen. This is incremented for each instance and passed by environment variable `PUP_CLUSTER_PORT`.
  - `commonPort` (optional): A number specifying a common port for all instances, opened by the built in load balancer.
  - `strategy` (optional): Load balancing strategy, should be set to "round-robin" or "ip-hash".

## Global configuration

Global configuration are entirely optional.

You can define global configuration options that apply to all processes. In addition to `processes:` the global configuration clauses are:

- `logger`: An object containing global logger configuration options.
- `watcher`: An object containing global watcher configuration options.
- `plugins`: An array containing configurations for all plugins that should be enabled.

### Logger

The global logger configuration allows you to control the logging settings for pup, and the defaults of each process. To use the global logger, include the following properties within your
configuration file:

- `console` (boolean): Set to true to enable logging to the console. Default is false.
- `stdout` (string): The file path to write standard output logs.
- `stderr` (string): The file path to write standard error logs.
- `decorateFiles` (boolean): Set to true to enable decoration in the output files. Default is false.
- `decorate` (boolean): **Only available in global scope.** Set to true to enable decoration in the logs. Default is false.
- `colors` (boolean): **Only available in global scope.** Set to true to enable colored output. Default is false.

These options can be used in both the global scope logger, and for each process like:

```jsonc
{
  "logger": {
    "console": true,
    "stdout": "/path/to/stdout.log",
    "stderr": "/path/to/stderr.log",
    "colors": true,
    "decorateFiles": true,
    "decorate": true
  },
  "processes": [
    {
      "id": "my-process",
      /* ... */
      "logger": {
        "console": true,
        "stdout": "/path/to/process.stdout.log",
        "stderr": "/path/to/process.stderr.log",
        "decorateFiles": true
      }
    }
  ]
}
```

### Watcher

The global watcher configuration allows you to control file watching settings for the entire library.

Enable watcher in the process configuration using `watch: ["paths","to","watch"]`.

To change default behavior of the global watcher, use the following properties within your configuration file:

- `interval` (number): The interval (in milliseconds) at which the watcher checks for file changes. Default is `1000`.
- `exts` (array of strings): The file extensions to watch. Default is `["ts", "tsx", "js", "jsx", "json"]`.
- `match` (array of strings): The patterns to match for watched files. Default is `["**/_._"]`.
- `skip` (array of strings): The patterns to exclude from watching. Default is `["**/.git/**"]`.

```json
{
  /* This entire section is optional, the defaults are shown below */
  "watcher": {
    "interval": 100, // default
    "exts": ["ts", "tsx", "js", "jsx", "json"], // default
    "match": ["**/_._"], // default
    "skip": ["**/.git/**"] // default
  },

  "processes": [
    {
      "id": "my-process",
      /* ... */
      "watch": ["src/"] // This will enable the watcher
    }
  ]
}
```

### Plugins

> **Note**: If you are interested in developing a custom plugin, there is a [guide](/pup/examples/plugins/README.html) and
> [example](https://github.com/Hexagon/pup/blob/main/docs/examples/plugins/log-interceptor.ts) available.

To activate plugins, add your plugins to the configuration using this pattern:

```jsonc
{
  /* ... */
  "processes": [/* ... */],
  "plugins": [
    /* Remote plugin ... */
    {
      "url": "https://deno.land/x/pup-example-plugin@0.0.1/mod.ts",
      "options": {
        /* Plugin specific configuration */
      }
    },
    /* ... or local plugin. */
    {
      "url": "./plugins/app-plugin.ts",
      "options": {
        /* Plugin specific configuration */
      }
    }
  ]
}
```

## Validating the Configuration

To ensure your configuration is valid, just run `pup` (or `pup --config custom/path/to/config.json`). If using pup as a library, you can use the `validateConfiguration()` function provided by the
`/lib/core/configuration.ts` file. This function checks if the configuration adheres to the schema and will throw an error if it doesn't.

With a valid configuration in place, you're ready to use Pup to manage your processes.

## VS Code Intellisense

If you want Intellisense and code completion for `pup.json`/`pup.jsonc` in VS Code, you can append the pup json schema to `json.schemas` in your user settings or project settings
(`.vscode/settings.json`).

It should look something like this:

```jsonc
{
  "json.schemas": [
    {
      "fileMatch": [
        "/pup.json",
        "/pup.jsonc"
      ],
      "url": "https://deno.land/x/pup/docs/pup.schema.json"
    }
  ]
}
```
