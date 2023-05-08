---
layout: page
title: "11. Changelog"
---

# 11. Changelog

---

All notable changes to this project will be documented in this section.

## [1.0.0-beta.22] - 2023-05-08

- Make `--` optional for `--help`, `--version` and `--upgrade`

## [1.0.0-beta.21] - 2023-05-05

- Regression fix for running without `--config`

## [1.0.0-beta.20] - 2023-05-05

- Regression fix for running without `--config`
- Add feature to run process as service workers (thread) instead of a full process
- Add service worker example
- Add `--worker` command line option, make `--cmd` optional, but require one of them.
- Add `worker:` option, make `cmd:` optional, but require one of them
- Ref processes, makes sure that child processes exit when pup exit
- Add -n pup to upgrader
- Remove explicit kill signal (fix for windows)
- Use map instead of object in watcher (typescript fix)

## [1.0.0-beta.19] - 2023-04-28

- Support passing one or more global environment variables to the service installer through `--env`
- Update documentation

## [1.0.0-beta.18] - 2023-04-25

- Dependency update fixing stopping of windows services

## [1.0.0-beta.17] - 2023-04-21

- Dependency update fixing plist generation

## [1.0.0-beta.16] - 2023-04-19

- Add windows support to service installer
- Update pup.schema.json

## [1.0.0-beta.15] - 2023-04-13

- Add service uninstall feature of https://deno.land/x/service to CLI

## [1.0.0-beta.14] - 2023-04-12

- Break out service installer to https://deno.land/x/service

## [1.0.0-beta.13] - 2023-04-08

- Add configuration option `terminate: "<cron pattern>"`, wich can be used to force-restart a process on a cron schedule.

## [1.0.0-beta.12] - 2023-04-08

- Add experimental service installers for sysvinit, docker-init and upstart

## [1.0.0-beta.11] - 2023-04-07

- Fix regression bug affecting user mode service installer

## [1.0.0-beta.10] - 2023-04-07

- Document manual steps needed to install pup as a system wide service

## [1.0.0-beta.6 - 1.0.0-beta.9] - 2023-04-07

- Add service installer, supporting systemd and launchd

## [1.0.0-beta.5] - 2023-04-04

- Fix: Regression bug where `--config` were not recognized at cli.

## [1.0.0-beta.4] - 2023-04-04

- Fix: Regression bug where `--upgrade` were not recognized at cli.
- Add alias `--update` for `--upgrade`.

## [1.0.0-beta.3] - 2023-04-04

- Bugfix, '--' not recognized as a command when running without configuration.

## [1.0.0-beta.2] - 2023-04-04

- CLI refactor. Add 'run', make no argument print help instead of start. Remove -- from start/stop/... and status.

## [1.0.0-beta.1] - 2023-03-30

- Fix --no-config mode. Environment variables were set to undefined which crashed the process runner.
- Add JavaScript extension to file links by @naltun in #12
- Fix typos in docs by @Leokuma in #13

## [1.0.0-beta.0] - 2023-03-30

- All intended features in place and working, moving on to beta stage.

## [1.0.0-alpha-35] - 2023-03-28

- Bugfix: Make web-interface plugin work when used to run a real application (still WIP though)

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
