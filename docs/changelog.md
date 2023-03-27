---
layout: page
title: "11. Changelog"
---

# 11. Changelog

---

# Changelog

All notable changes to this project will be documented in this section.

## [1.0.0-alpha-34] - 2023-03-25

- Bugfix: Fix telemetry IPC

## [1.0.0-alpha-33] - 2023-03-25

- Chore: Refactor updater
- Chore: Fix documentation typos

## [1.0.0-alpha-32] - 2023-03-24

- Feature: IPC functionality in the Telemetry client.
- Add: Print process type (main/cluster/process) on cli `--status`.
- Change: IPC file for main process changed from `.*-tmp/.ipc` to `.*-tmp/.main.ipc`.
- Feature: Add `LEAST_CONNECTIONS` strategy to load balancer.
- Tests: Added tests for telemetry functionality.
- Feature: Add command line flag `--upgrade <optional version>`

## [1.0.0-alpha-31] - 2023-03-23

- Bigfix: Regression bug in CLI

## [1.0.0-alpha-30] - 2023-03-23

- Plugins: Add experimental Splunk Http Event Collector (HEC) plugin.
- Plugins: Improve web interface plugin.
- Chore: Refactor CLI-related code.
- Fix: Improve ip-hash algorithm for more even distribution of clients over the back-ends.
- Feature: Add process configuration option path. The specified value will be appended to the PATH env variable for the configured process.

## [1.0.0-alpha-29] - 2023-03-22

- Change: Replace Deno.cmd with Deno.Command, removing the need for --unstable since Deno 1.31.0 (discussion #11)
- Feature: Add process telemetry for Deno client processes
- Fix: Prevent two instances running the same configuration
- Fix: Strip ansi color codes from logfiles
- Fix: Make (the very experimental) web interface work behind reverse proxies
- Chore: Dependency updates
- Chore: Improvements to documentation

## [1.0.0-alpha-28] - 2023-03-21

- Chore: Major refactor of plugin interface
- Feature: Add (WIP) web interface plugin
- Docs: Update documentation
