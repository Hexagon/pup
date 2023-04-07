---
layout: page
title: " 1. Overview"
---

# 1. Overview

---

Pup is a powerful process manager for Deno, designed to simplify the management of your applications and services. Here are some of the key features:

- **Easy process management:** Define, control, and manage your processes with simple commands and configuration options.
- **Multiple start policies:** Set up processes to start automatically, on a schedule (using cron expressions), or when files change.
- **Restart policies:** Configure processes to restart automatically, either always or only in case of errors, with optional delay and restart limits.
- **Clustering and load balancing:** Scale your application seamlessly with built-in clustering and load balancing capabilities.
- **Flexible configuration:** Define global settings and per-process configurations, including logging, working directories, environment variables, and more.
- **Plugin support:** Extend Pup's functionality with custom plugins for additional features and integrations.
- **CLI and programmatic usage:** Manage your processes using the Pup command-line interface, or integrate Pup directly into your Deno applications.
- **Process Telemetry and IPC:** Pup can gather telemetry data from Deno client processes, such as memory usage and current working directory, providing deeper insights into managed processes. The
  telemetry feature also enables inter-process communication, allowing connected processes to interact with one another.

> **Note** Programmatic usage, process telemetry, and IPC are currently available only when running Deno client processes.

Pup is centered on a single configuration file, ideally named pup.json or pup.jsonc, which manages all aspects of the processes to be executed, including their execution methods and logging handling.

## Table of Contents

- [Overview](./)
- [Installation](./installation.html)
- [Usage](./usage.html)
  - [General flags](./usage.html#general-flags)
  - [Configuring using the cli](./usage.html#configuring-using-the-cli)
  - [Single command usage](./usage.html#single-command-usage)
  - [The working directory](./usage.html#working-directory)
- [Configuration](./configuration.html)
  - [Creating the Configuration File](./configuration.html#creating-the-configuration-file)
  - [Configuration Options](./configuration.html#configuration-options)
  - [Process configuration](./configuration.html#process-configuration)
    - [Start policy](./configuration.html#start-policy)
    - [Restart policy](./configuration.html#restart-policy)
  - [Global configuration](./configuration.html#global-configuration)
    - [Logger](./configuration.html#watcher)
    - [Watcher](./configuration.html#logger)
    - [Plugins](./configuration.html#plugins)
  - [Validating the Configuration](./configuration.html#validating-the-configuration)
  - [VS Code Intellisense](./configuration.html#vs-code-intellisense)
- [Run at boot](./service.html)
  - [Using the CLI (systemd and launchd)](./service.html#using-the-cli)
    - [service argument reference](./service.html#service-argument-reference)
  - [Using Docker](./service.html#using-docker)
  - [Installing manually using systemd](./service.html#manual-guide-using-systemd)
  - [Installing manually using launchd](./service.html#manual-guide-using-launchd)
- [Clusters and Load Balancer](./scaling.html)
  - [Creating a cluster](./scaling.html#creating-a-cluster)
  - [Using the load balancer](./scaling.html#using-the-load-balancer)
- [Library usage](./library.html)
- [FAQ](./faq.html#faq)
- [Troubleshooting](./troubleshooting.html)
- [Contributing](./contributing.html)
- [Changelog](./changelog.html)
