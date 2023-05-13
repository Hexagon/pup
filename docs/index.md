---
layout: page
title: " 1. Overview"
---

# 1. Overview

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

> **Note** Programmatic usage, process telemetry, and IPC are currently available only when running Deno client processes.

Pup is centered on a single configuration file, ideally named `pup.json` or `pup.jsonc`, which manages all aspects of the processes to be executed, including their execution methods and logging
handling.

## Table of Contents

- [Overview](./)
- [Installation](./installation.html)
- [Usage](./usage.html)
  - [General flags](./usage.html#general-flags)
  - [Configuring using the cli](./usage.html#configuring-using-the-cli)
  - [Single command usage](./usage.html#single-command-usage)
  - [The working directory](./usage.html#working-directory)
- [Configuration](./configuration.html)
  - [Process configuration](./configuration.html#process-configuration)
    - [General](./configuration.html#general)
    - [Start policy](./configuration.html#start-policy)
    - [Restart policy](./configuration.html#restart-policy)
    - [Stop/restart policy](./configuration.html#stop-restart-policy)
    - [Clustering](./configuration.html#clustering)
  - [Global configuration](./configuration.html#global-configuration)
    - [Logger](./configuration.html#watcher)
    - [Watcher](./configuration.html#logger)
    - [Plugins](./configuration.html#plugins)
  - [Validating the Configuration](./configuration.html#validating-the-configuration)
  - [VS Code Intellisense](./configuration.html#vs-code-intellisense)
- [Run at boot](./service.html)
  - [Using the CLI](./service.html#using-the-cli)
    - [Prerequisites](./service.html#prerequisites)
    - [User mode installation](./service.html#user-mode-installation)
    - [System mode installation](./service.html#system-mode-installation)
    - [Service argument reference](./service.html#service-argument-reference)
  - [Using Docker](./service.html#using-docker)
  - [Installing manually using systemd](./service.html#manual-guide-using-systemd)
  - [Installing manually using launchd](./service.html#manual-guide-using-launchd)
- [Clusters and Load Balancer](./scaling.html)
  - [Clustering](./scaling.html#clustering)
  - [Using the load balancer](./scaling.html#using-the-load-balancer)
    - [Built-in vs External Load Balancer](./scaling.html#built-in-vs-external-load-balancer)
    - [Ip-hash for Stateful Applications](./scaling.html#ip-hash-for-stateful-applications)
- [Library usage](./library.html)
- [FAQ](./faq.html#faq)
- [Troubleshooting](./troubleshooting.html)
- [Contributing](./contributing.html)
- [Changelog](./changelog.html)
