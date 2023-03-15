---
layout: page
title: Usage
---

## Usage

Pup offers various command line parameters to help you control its behavior. These parameters are grouped into general flags, init, append, and no-config options. In this section, we'll describe each
group and provide examples of usage.

### General Flags

General flags are used to control the basic behavior of Pup and can be combined with other command line parameters.

- `-h, --help`: Display the help message with a list of available commands and options.
- `-v, --version`: Show the current version of Pup.

### Configuring using the cli

### Init

The `init` command is used to create a new configuration file with a single process entry. The following options are available:

**Basic settings**

- `--id <id>`: Specify the unique identifier for the process.
- `--cmd <cmd>`: Specify the command to run the process.
- `--cwd <cwd>` (optional): Set the working directory for the process.

**Start policy**

- `--cron <cron>` (optional): Set the cron schedule for the process.
- `--autostart <autostart>` (optional): Enable or disable autostart for the process (true or false).
- `--watch <watch>` (optional): Set a path to watch for changes, triggering a restart of the process.

Example:

```bash
pup init --id myprocess --cmd "node server.js" --cwd /path/to/project --cron "0 0 * * *" --autostart
```

More advanced options, like logging to file, or writing of pid files, are available by editing the configuration file manually.

### Append

The `append` command is used to add a new process entry to an existing configuration file. The options available for `init` are also applicable to the `append` command.

Example:

```bash
pup --append --id anotherprocess --cmd "python script.py" --cwd /path/to/another/project
```

> **Warning** When using `--append` to modify an existing configuration file, any comments will be stripped.

### Single command usage

The `--no-config` or `-n`option allows you to start a single process using command line parameters without reading or writing any configuration file. This mode uses default options for logging.

To run Pup in no-config mode, use the `--no-config` or `-n` flag, followed by a command and a restart policy. `id` is optional in this mode.

- `--cmd <cmd>`: Specify the command to run the process.

And one of the start policies

- `--cron <cron>` (optional): Set the cron schedule for the process.
- `--autostart <autostart>` (optional): Enable or disable autostart for the process (true or false).
- `--watch <watch>` (optional): Set a path to watch for changes, triggering a restart of the process.

Example:

```bash
pup --no-config --cmd "npm run server" --autostart
```

The same example, using short aliases for the command line parameters.

```bash
pup -nAc "npm run server"
```

### Working directory

The working directory of pup will always be the location of `pup.jsonc`, and relative paths in configuration will stem from there. You can override this per-process by supplying `--cwd` to the cli, or
using the option `cwd:` in the configuration.
