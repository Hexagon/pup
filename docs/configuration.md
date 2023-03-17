---
layout: page
title: 4. Configuration
---

# 4. Configuration

In this section, you will learn how to create and manage configuration files for Pup.

To create a configuration file for Pup, first create a new file named `pup.json` in your project's root directory. You can also name it `pup.jsonc` if you want to use jsonc-style comments. Then, add
the following basic structure to the file:

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

This basic configuration defines a single process named example that runs a Deno script (app.ts) with the `--allow-net` flag. You can customize the configuration to suit your needs by adding more
processes or updating the existing process definition.

## Process configuration

Here's a list of available configuration options for each process:

**General**

- `id` (**required**): A unique identifier for the process.
- `cmd` (**required**): An array containing the command and its arguments to run the process.
- `cwd` (optional): The working directory for the process.
- `env` (optional): An object containing environment variables for the process.
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

## Global configuration

Global configuration are entirely optional.

You can define global configuration options that apply to all processes. In addition to `processes:` the global configuration clauses are:

- `logger`: An object containing global logger configuration options.
- `watcher`: An object containing global watcher configuration options.

### Logger

The global logger configuration allows you to control the logging settings for pup, and the defaults of each process. To the global logger, include the following properties within your configuration
file:

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

The global watcher configuration allows you to control file watching settings for the entire library. To configure the global watcher, include the following properties within your configuration file:

- `interval` (number): The interval (in milliseconds) at which the watcher checks for file changes. Default is 100.
- `exts` (array of strings): The file extensions to watch. Default is ["ts", "tsx", "js", "jsx", "json"].
- `match` (array of strings): The patterns to match for watched files. Default is ["**/_._"].
- `skip` (array of strings): The patterns to exclude from watching. Default is ["**/.git/**"].

Then enable watcher in the process configuration using `watch: ["paths","to","watch"]`. An example:

{ "watcher": { "interval": 100, "exts": ["ts", "tsx", "js", "jsx", "json"], "match": ["**/_._"], "skip": ["**/.git/**"] }, "processes": [ { "id": "my-process", /* ... */ "watch": ["src/"] } ] }

## Validating the Configuration

To ensure your configuration is valid, just run `pup`. If using pup as a library, can use the validateConfiguration() function provided by the `/lib/core/configuration.ts` file. This function checks
if the configuration adheres to the schema and throws an error if it doesn't.

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
