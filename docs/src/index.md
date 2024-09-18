---
title: "Overview"
nav_order: 1
---

# Pup

---

Pup is a powerful universal process manager developed with Deno, designed to keep your scripts, applications and services alive.

- **Cross-platform:** Manage processes for various languages and platforms, such as Deno, Node.js, Python, and Ruby on Windows, macOS, and Linux.
- **Process management:** Define, control, and manage your processes with simple commands and configuration options.
- **Autostart, watch or cron:** Set up processes to start automatically, on a schedule (using cron expressions), or when files change.
- **Service management**: Install Pup instances as a system service, supporting sysvinit, systemd, upstart, macOS, and Windows.
- **Clustering and load balancing:** Scale your application seamlessly with built-in clustering and load balancing capabilities.
- **Plugins:** Extend Pup's functionality with custom plugins for additional features and integrations.
- **Process Telemetry and IPC:** Pup can gather telemetry data from Deno client processes, such as memory usage and current working directory, providing deeper insights into managed processes. The
  telemetry feature also enables inter-process communication, allowing connected processes to interact with one another.
- **Rest API:** Control and monitor Pup from third party solutions using the build in Rest API.

> **Note** Programmatic usage, process telemetry, and IPC are currently available only when running Deno client processes. { .note }

Pup is centered on a single configuration file, `pup.json`, which manages all aspects of the processes to be executed, including their execution methods and logging handling.
[JSON5](https://github.com/json5/json5) syntax is supported.

## Quick Start

### Installation

To install Pup, make sure you run the latest version of Deno (`deno upgrade`), then open your terminal and execute the following command:

```bash
deno run -Ar jsr:@pup/pup setup
```

This command downloads the latest version of Pup and installs it on your system. Read more abour release channels [here](https://pup.56k.guru/installation/#release-channels).

### Configuration and Usage

Pup revolves around instance configuration files, where each managed process belongs to an instance defined by a `pup.json`. This file can either be created manually, or by the command line helpers
used below:

1. To create a simple instances running a single process:

   `pup init --id "my-server" --autostart --cmd "deno run -A server.ts"`

   If you intend to create multiple pup instances on the same server, you can pass an instance name through `--name my-instance-name`. This name will also be used as the system service name.

2. _(Optional)_ In case you have an additional task to execute, such as a cleanup script, you can make use of `pup append`. The following example shows how to add an extra task that use the cron start
   policy:

   `pup append --id "my-task" --cmd "deno run -A task.ts" --cron "0 0 * * * *"`

3. _(Optional)_ Test your instance by running it foreground using `pup run` (exit by pressing CTRL+C):

4. To make your instance run at boot, enable it using `pup enable-service`.

   Will by default use the instance name for service name, which defaults to `pup`. You can override by passing `-n my-custom-name`.

5. To stream the logs from a running instance, use the command `pup monitor`. To show historic logs, use `pup logs`.

   Will by default use the instance name for service name, which defaults to `pup`. You can override by passing `-n my-custom-name`.

#### Single command example

It is possible to use pup without a `pup.json` or system service.

**Keeping a process alive**

To keep a process alive temporary, use `pup run` with `--cmd` and a start policy

`pup run --autostart --cmd "deno run server.ts"`

**Restarting a process on filesystem changes**

To restart if any file changes withing the current directory, add `--watch <watched-path>`:

`pup run --autostart --cmd "deno run server.ts" --watch .`
