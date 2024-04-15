---
title: "Overview"
nav_order: 1
---

# Overview

---

Pup is a powerful process manager for Deno, designed to simplify the management of your applications and services. Here are some of the key features:

- **Cross-platform and wide OS compatibility:** Manage processes for various languages and platforms, such as Deno, Node.js, Python, and Ruby on Windows, macOS, and Linux.
- **Process management:** Define, control, and manage your processes with simple commands and configuration options.
- **Multiple start/restart policies:** Set up processes to start automatically, on a schedule (using cron expressions), or when files change.
- **Service management**: Built-in installer for Linux (sysvinit, systemd, upstart), macOS, and Windows services.
- **Clustering and load balancing:** Scale your application seamlessly with built-in clustering and load balancing capabilities.
- **Plugins:** Extend Pup's functionality with custom plugins for additional features and integrations.
- **Process Telemetry and IPC:** Pup can gather telemetry data from Deno client processes, such as memory usage and current working directory, providing deeper insights into managed processes. The
  telemetry feature also enables inter-process communication, allowing connected processes to interact with one another.

> **Note** Programmatic usage, process telemetry, and IPC are currently available only when running Deno client processes. { .note }

Pup is centered on a single configuration file, `pup.json`, which manages all aspects of the processes to be executed, including their execution methods and logging handling.
[JSON5](https://github.com/json5/json5) syntax is supported.

## Quick Start

### Installation

To install Pup, open your terminal and execute the following command:

```bash
deno run -Ar jsr:@pup/pup@1.0.0-rc.22 setup --channel prerelease
```

This command downloads the latest version of Pup and installs it on your system. The `--channel prerelease` option is included as there is no stable version of Pup yet. Read more abour release
channels [here](https://hexagon.github.io/pup/installation.html#release-channels).

### Configuration

Pup revolves around instances configuration files, each process belongs to an instances defined by a `pup.json`. This file can either be created manually, or by the command line helpers.

1. To create a simple instances running a single process:

   `pup init --id "my-server" --autostart --cmd "deno run -A server.ts"`

2. (Optional) In case you have an additional task to execute, such as a cleanup script, you can make use of `pup append`. The following example shows how to add an extra task that use the cron start
   policy:

   `pup append --id "my-task" --cmd "deno run -A task.ts" --cron "0 0 * * * *"`

3. (Optional) Test run your instance:

   `pup run`

4. To make your instance run at boot, enable it using `pup enable-service`.

   `pup enable-service`

   You can pass `-n my-custom-name` to give the service a name different from `pup`

#### Single command example

It is possible to use pup to keep a process alive temporary, without a `pup.json` or system service.

To achieve this, use `pup run` with `--cmd` and a start policy, the default restart policy is `--autostart`.

`pup run --autostart --cmd "deno run server.ts"`
