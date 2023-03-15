---
layout: page
title: Pup - Universal process manager
tagline: Test tagline
description: Test description
remote_theme: amitmerchant1990/reverie
---

# Pup - Simple yet powerful Process Manager

Pup is a command-line tool that simplifies the management of processes. Pup can start, stop, restart, and keep processes alive, as well as schedule processes using a cron pattern. It does also manage
the logs of each process, gathering them into a single stdout or file, making it easy to monitor and analyze the output of your processes in one place.

Pup can also watch the filesystem, and restart processes when files change, similar to Nodemon and Denon.

In addition to serving as a stand alone process manager, Pup can also function as a [as a library](#library-usage), allowing you to seamlessly manage the internal process ecosystem of your
application.

Pup revolves around a single configuration file, by default named 'pup.jsonc', which control every aspect of the processes to be executed, their execution methods, and the handling of logging.

> **Note** Please note that Pup is currently in an early stage of development and may contain bugs or unexpected behavior. Use at your own risk.