---
title: "Usage"
nav_order: 3
has_children: true
---

# Usage

---

{:toc}

Pup offers various command line parameters to help you control its behavior. These parameters are grouped into general flags, init, append, and no-config options. In this section, we'll describe each
group and provide examples of usage.

## General Flags

General flags are used to control the basic behavior of Pup and can be combined with other command line parameters.

- `-h, help`: Display the help message with a list of available commands and options.
- `-v, version`: Show the current version of Pup.
- `upgrade <version>`: Upgrade pup to the latest, or specified, version.

## Running in foreground

To test your configuration, you can run Pup in the foreground using the `run` command, optionally followed by the `--config` option:

```bash
# This will use pup.json or pup.jsonc in current directory
pup run

# or
pup run --config path/to/config-file
```

## Running as a service

You can run Pup in as a service by using the `enable-service` command, optionally followed by the `--config` option:

```bash
# This will install a system service and run pup in the background
pup enable-service

# or
pup enable-service --config path/to/config-file
```

## Viewing Logs

Pup enables you to inspect its internally stored logs through the `logs` command, or live stream the logs using the `monitor` command. Both options supports arguments to help filter the logs and
customize the output:

### Arguments to both `logs` and `monitor`

- `--id <process-id>`: (optional) Allows filtering of logs based on the process ID.
- `--severity <severity>`: (optional) Enables filtering logs based on the severity level. The acceptable severity levels include error, warning, info, and log.

### ´logs´ only

- `-n`: (optional) Defines the number of log entries to display.
- `--start <iso860-timestamp>`: (optional) Allows you to display logs that were generated after a specified timestamp. The timestamp should be in the ISO8601 format.
- `--end <iso860-timestamp>`: (optional) Lets you display logs generated before a particular timestamp. The timestamp should be in the ISO8601 format.

> **Note**: The internal logger keeps logs for a default period of 24 hours. You can modify this setting via the global logger configuration. { .note }

To use the `logs` command, execute the following commands:

```bash
# This will use pup.json or pup.jsonc in the current directory
pup logs

# or
pup logs --config path/to/config-file

# or
pup logs --cwd path/where/config/file/is
```

## Controlling running instances

The pup CLI can be used to control running instances, using the following command line flags. Run in a directory with a `pup.json`, or point to the correct instance configuration using
`--config "path/to/config"` or short option `-c "path/to/config"`.

- `restart all|process-id`: Restarts, or starts, the running processes `process-id`, or all processes
- `start all|process-id`: Starts the running processes `process-id`, or all processes if not already running
- `stop all|process-id`: Stops the process `process-id`, or all processes, if they are running. Process will restart instantly if configured to. Avoid autorestart if needed by first calling block.
- `block all|process-id`: Block the process `process-id`, or all processes, completely from starting.
- `unblock all|process-id`: Unblock the process `process-id`, or all processes, allowing it to start again. Will not start the process.

- `terminate`: Stop all processes and exit.

Example to restart task-1 started using `pup.json` in the current directory.

`pup restart task-1`

Example to stop task-2 started using `/root/pup.json` in the current directory. Requires write permission to `/root/`

`pup stop task-2 --config /root/pup.json`

## Configuring using the cli

### Init

The `init` command is used to create a new configuration file with a single process entry. The following options are available:

**Intance settings**

- `--name <instance-name>` (optional): Specify a unique identifier for the instance

**Process settings**

- `--id <id>`: Specify the unique identifier for the process.
- `--cmd <cmd>`: Specify the command to run the process, supports common shell features through [dax](https://github.com/dsherret/dax).
- `--worker <path>`: Specify the path of the worker.
- `--cwd <cwd>` (optional): Set the working directory for the process.

**Logger**

- `--stdout <stdout-path>` (optional): Enable logging to file by specifying the path to the log file, catches both stdout and stderr if stderr is not explicitly specified.
- `--stderr <stderr-path>` (optional): Enable logging stderr to file by specifying the path to the log file.

**Start policy**

- `--cron <cron>` (optional): Set the cron schedule for the process.
- `--autostart <autostart>` (optional): Enable or disable autostart for the process (true or false).
- `--watch <watch>` (optional): Set a path to watch for changes, triggering a restart of the process.

**Stop/restart policy**

- `--terminate <cron>` (optional): Set a cron schedule for the process to terminate, combined with --autostart, this becomes a restart policy.

**Cluster**

- `--instances <n>`: The number of instances to run using this configuration.

**Load balancer**

- `--start-port <port>`: A number specifying the port on which each instance should listen. This is incremented for each instance and passed by environment variable `PUP_CLUSTER_PORT`.
- `--commonPort <port>`: A number specifying a common port for all instances, opened by the built in load balancer.
- `--strategy <strategy-name>` (optional): Load balancing strategy, should be set to `round-robin`, `least-connections` or `ip-hash`. Defaults to `round-robin`.

Example:

```bash
pup init --name my-instance --id my-process --cmd "node server.js" --cwd /path/to/project --cron "0 0 * * *" --autostart
```

More advanced options, like logging to file, or writing of pid files, are available by editing the configuration file manually.

### Append

The `append` command is used to add a new process entry to an existing configuration file. The options available for `init` are also applicable to the `append` command.

Example:

```bash
pup append --id anotherprocess --cmd "python script.py" --cwd /path/to/another/project
```

> **Warning** When using `append` to modify an existing configuration file, any comments will be stripped. { .note }

### Single command usage

The `run` argument allows you to start a single process using command line parameters without reading or writing any configuration file. This mode uses default options for logging.

To run Pup in no-config mode, pass `--cmd` or `--worker`, followed by a command and a start policy. `--id` is optional in this mode.

- `--cmd <cmd>`: Specify the command to run the process.
- `--worker <path>`: Specify the path of the worker.

And one of the start policies

- `--cron <cron>` (optional): Set the cron schedule for the process.
- `--autostart <autostart>` (optional): Enable or disable autostart for the process (true or false).
- `--watch <watch>` (optional): Set a path to watch for changes, triggering a restart of the process.

Example:

```bash
pup run --cmd "deno run server.ts" --autostart
```

The same example, using short aliases for the command line parameters.

```bash
pup run -A -C "deno run server.ts"
```

It is also possible to specify command using '--' instead of '-C'. In this case, the command should be written without quotation marks.

```bash
pup run -A -- deno run server.ts
```

All of the flags listed in the init/append sections above are usable in this mode.

## Working directory

The working directory of pup will always be the location of `pup.jsonc`, and relative paths in configuration will stem from there. You can override this per-process by supplying `--cwd` to the cli, or
using the option `cwd:` in the configuration.
