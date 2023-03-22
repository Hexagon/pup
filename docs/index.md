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
- **Clustering and load balancing:** Easily scale your processes with built-in clustering and load balancing support.
- **Flexible configuration:** Define global settings and per-process configurations, including logging, working directories, environment variables, and more.
- **Plugin support:** Extend Pup's functionality with custom plugins for additional features and integrations.
- **CLI and programmatic usage:** Manage your processes using the Pup command-line interface, or integrate Pup directly into your Deno applications.
- **Process Telemetry:** Pup can collect telemetry data from client processes written in Deno, such as memory usage and current working directory. This can be used to provide better insights into the
  managed processes.

Pup revolves around a single configuration file, preferably named `pup.json` or `pup.jsonc`, which control every aspect of the processes to be executed, their execution methods, and the handling of
logging.

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
  - [Using Docker](./service.html#using-docker)
  - [Using a Systemd user service](./service.html#using-a-systemd-user-service)
  - [Using launchd user service](./service.html#using-launchd-on-macos)
- [Clusters and Load Balancer](./scaling.html)
  - [Creating a cluster](./scaling.html#creating-a-cluster)
  - [Using the load balancer](./scaling.html#using-the-load-balancer)
- [Library usage](./library.html)
- [FAQ](./faq.html#faq)
- [Troubleshooting](./troubleshooting.html#troubleshooting)
- [Contributing](./contributing.html)
