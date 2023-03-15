---
layout: page
title: The Manual
---

## Pup - The Manual

Pup is a command-line tool that simplifies the management of processes. Pup can start, stop, restart, and keep processes alive, as well as schedule processes using a cron pattern. It does also manage
the logs of each process, gathering them into a single stdout or file, making it easy to monitor and analyze the output of your processes in one place.

Pup can also watch the filesystem, and restart processes when files change, similar to Nodemon and Denon.

In addition to serving as a stand alone process manager, Pup can also function as a [as a library](#library-usage), allowing you to seamlessly manage the internal process ecosystem of your
application.

Pup revolves around a single configuration file, by default named `pup.jsonc`, which control every aspect of the processes to be executed, their execution methods, and the handling of logging.

## Table of Contents

1. [The Pup Manual](#overview)
2. [Installation](#installation)

- [Usage](#usage)
  - [General flags](#general-flags)
  - [Configuring using the cli](#configuring-using-the-cli)
  - [Single command usage](#single-command-usage)
  - [The working directory](#working-directory)
- [Configuration](#configuration)
  - [Creating the Configuration File](#creating-the-configuration-file)
  - [Configuration Options](#configuration-options)
  - [Process configuration](#process-configuration)
    - [Start policy](#start-policy)
    - [Restart policy](#restart-policy)
  - [Global configuration](#global-configuration)
    - [Logger](#watcher)
    - [Watcher](#logger)
  - [Validating the Configuration](#validating-the-configuration)
  - [VS Code Intellisense](#vs-code-intellisense)
- [Library usage](#library-usage)
  - [Process Management](#process-management)
  - [Monitoring Process Information](#monitoring-process-information)
  - [Logging](#logging)
  - [File Watching](#file-watching)
  - [Cron Scheduling](#cron-scheduling)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
  - [Reporting bugs and requesting features](#reporting-bugs-and-requesting-features)
  - [Submitting code changes](#submitting-code-changes)
  - [Improving documentation](#improving-documentation)
  - [Helping other users](#helping-other-users)
