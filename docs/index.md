---
layout: page
title: 1. Overview
---

## Pup - The Manual

Pup is a command-line tool that simplifies the management of processes. Pup can start, stop, restart, and keep processes alive, as well as schedule processes using a cron pattern. It does also manage
the logs of each process, gathering them into a single stdout or file, making it easy to monitor and analyze the output of your processes in one place.

Pup can also watch the filesystem, and restart processes when files change, similar to Nodemon and Denon.

In addition to serving as a stand alone process manager, Pup can also function as a [as a library](#library-usage), allowing you to seamlessly manage the internal process ecosystem of your
application.

Pup revolves around a single configuration file, by default named `pup.jsonc`, which control every aspect of the processes to be executed, their execution methods, and the handling of logging.

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
  - [Validating the Configuration](./configuration.html#validating-the-configuration)
  - [VS Code Intellisense](./configuration.html#vs-code-intellisense)
- [Library usage](./library.html)
- [FAQ](./faq.html#faq)
- [Troubleshooting](./troubleshooting.html#troubleshooting)
- [Contributing](./contributing.html)
