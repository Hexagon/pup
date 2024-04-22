---
title: "Changelog"
nav_order: 13
---

# Changelog

---

All notable changes to this project will be documented in this section.

## [1.0.0-rc.30] - Unreleased

- fix(rest): Add `/log` to the rest api
- chore(docs): Add Rest API docs.
- fix(core): Reset restart count on any kind of manual start

## [1.0.0-rc.29] - 2024-04-22

- fix(docs): Update docs to include the latest features.
- fix(core): Fix regression which caused an error when running without configuration.
- fix(watcher): Fix an issue where the watcher prevented the main process to exit on termination.
- fix(cli): Fix pup init

## [1.0.0-rc.28] - 2024-04-22

- fix(core): Generate secret before starting main process.

## [1.0.0-rc.27] - 2024-04-21

- fix(upgrader): Update upgrader. **If coming from a previous version, you'll have to run upgrade twice to make pup work**

## [1.0.0-rc.26] - 2024-04-21

- fix(core): Remove stray console.log
- fix(core): Fix working dir different from current dir
- feat(rest): Add rest API with JWT Bearer auth
- change(cli): Use rest api instead of file ipc for cli commands
- change(telemetry): Use rest api for child -> host process communcation
- change(core): Remove FileIPC entirely from the main process
- fix(core): Update dependency @cross/env to fix a bug in windows caused by legacy environment variable keys such as `=C:`
- feat(cli): Add cli command `monitor` for streaming logs
- change(plugins): Remove programmatic api and bundled plugins. Plugins will now be entirely separate from pup, and communicate through the Rest API.
- chore(core): Internal refactor getting closer to being runtime agnostic
- feat(cli): Add cli command `token`to generate new API tokens
- change(api): Expose configuration to the API
- change(core): Expose port in the application status
- fix(core): Fix `enable-service` in Windows by updating dependency `@cross/service`

## [1.0.0-rc.25] - 2024-04-17

- fix(plugins): Workaround for jsr bug affecting the web-interface plugin

## [1.0.0-rc.24] - 2024-04-17

- chore(cli): Refactor of the cli entrypoint code
- fix(plugins): Fix web-interface plugin by switching bundlee mode from import to fetch mode

## [1.0.0-rc.23] - 2024-04-16

- fix(cli): Visual improvements for `--help`
- fix(cli): Compacted and colorised output of `status`
- fix(cli): Bolded headers by default in all table headers
- feat(core/configuration): Add configuration entry for instance name (`name`)
- chore(docs): Update examples for jsr usage, general update of telemetry example, docs for `name`, convert docs to jsr.io
- fix(plugins): Convert web-interface plugin to jsr.io

## [1.0.0-rc.22] - 2024-04-15

- fix(core): Pup now require `uid` and `gid` added to `--allow-sys` to be able to spawn subprocesses

## [1.0.0-rc.21] - 2024-04-15

- fix(runner): Always pass all environment variables from pup environment to sub process, extend them if `env:`-option is supplied
- fix(runner): Use correct PATH separator (`;`) when spawning child processes in Windows
- fix(docs): Revert to using deno.land/x as source for schema.json, until first stable release

## [1.0.0-rc.20] - 2024-04-14

- fix(plugins): Export plugin entrypoints on jsr.io
- fix(core): Fix issue with PATH variable in process runner.

## [1.0.0-rc.19] - 2024-04-14

- fix(core): Fix issue with PATH variable in process runner.
- chore(core): Make code related to environment variables cross-runtime.
- change(cli): Revert cli command `foreground` to `run`

## [1.0.0-rc.18] - 2024-04-14

- fix(packaging): Fix regression bug in upgrader after moving to jsr.io

## [1.0.0-rc.15] - 2024-04-11

- **Minimum Deno Version:** Pup now require Deno version `1.42.0` or later. If you're using an older version, you'll need to upgrade Deno before upgrading Pup.

### Breaking Changes

- change(cli): Rename cli command `run` to `foreground` to not be confused with starting as a service
- change(cli): Rename cli command `install` to `enable-service` to separate from actual pup installation
- change(cli): Rename cli command `uninstall` to `disable-service` to separate from actual pup uninstallation
- change(config): Support JSON5.
- change(core): Move .pup.jsonc-tmp, .pup.jsonc-data into .pup
- change(packaging): Move default installation docs/references from `deno.land/x` to JSR.io

### Non-breaking

- fix(core): run command did not keep an autostarted process running, fixed by refing the watchdog timer.
- fix(cli): Controlled output of manual rests after installing/uninstalling as service.
- fix(docs): Docs incorrectly stated that `**/_._` is default for watcher config. `**/*.*` is correct.
- fix(schema): Expect Record<string, string> for process.env in json schema.
- change(core): Make most code cross runtime, preparing for Node and Bun support.

## Maintenance

- chore(deps): Replace `deno.land/x/udd` with `@check/deps`
- chore(deps): Use `@cross/deps` for cross-runtime filesystem operations
- chore(deps): Replace `deno.land/x/hexagon/service` with `@cross/service` for cross-runtime service installation
- chore(deps): Replace `deno.land/x/std/` with `@std/` from jsr
- chore(deps): Replace `deno.land/x/dax` with `dax-sh` for a cross runtime shell
- chore(deps): Replace `deno.land/x/zod` with `npm:zod`
- chore(deps): Utilize `@cross/utils` instead of Deno built-ins for cross runtime ansi console output, argument parsing, process management and more.
- chore(deps): Use `@cross/env` to handle enviroment variables across runtimes.
- chore(testing): Use `@cross/test` insted of Deno test runner, to utilize the native test runners of Node, Deno and Bun.

## [1.0.0-rc.14] - 2024-04-07

- fix(loadbalancer): Fixes an issue with the loadbalancer introduced in `1.0.0-rc.13`

### Fixes

## [1.0.0-rc.13] - 2024-04-06

### Important Changes

- **Minimum Deno Version:** Pup now require Deno version `1.38.0` or later. If you're using an older version, you'll need to upgrade Deno before upgrading Pup.

### Fixes

- fix(core): The code has been updated to use `--unstable-kv` to maintain compatibility as `--unstable` is being phased out in Deno 2.0.
- fix(cluster): The internal cluster server now uses `Deno.serve` instead of the deprecated `Deno.serveHttp` for alignment with current Deno practices.
- chore(ci): Remove `--unstable` in CI and
- chore(deps): Full dependency update. Replace `lt` with `lessThan`, `gt` with `greaterThan`, and `deferred` with native Promises.

## [1.0.0-rc.12] - 2023-11-22

- fix(logger): Store (sliced) log lines larger than Deno's KV limit of 64KiB
- fix(logger): Guarantee that log messages are stored in chronological order per process

## [1.0.0-rc.11] - 2023-10-22

- chore(deps): Full dependency update
- fix(core): Fix issue #45 where watcher refused to stop
- fix(docs): Fix broken links

## [1.0.0-rc.10] - 2023-09-28

- chore(deps): Full dependency update

## [1.0.0-rc.9] - 2023-08-23

- fix(telemetry): Fixes issue where telemetry kept child process running even after calling `.close()` on the telemetry instance.

## [1.0.0-rc.8] - 2023-08-23

- feature(process): Now that [Dax 0.34.0](https://github.com/dsherret/dax/releases/tag/0.34.0) supports it, send `SIGTERM` instead of `SIGKILL` to terminate processes.
- fix(plugin): Do not error if plugin does not have a cleanup function implementated.
- chore(deps): Full dependency update

## [1.0.0-rc.7] - 2023-08-06

- fix(configuration): Allow any value under configuration path `plugins.options`, update json schema.
- fix(process): Many CLI commands such as `start`, `stop` and `terminate` were returning "Action failed" even though they worked.

## [1.0.0-rc.6] - 2023-07-30

- fix(web-interface): Only display logs from selected process
- feature(web-interface): Add button to show logs for core process
- chore(deps): Update Deno std from `0.195.0` to `0.196.0`
- chore(deps): Update [croner](https://github.com/hexagon/croner) from `6.0.6` to `6.0.7`

## [1.0.0-rc.5] - 2023-07-22

- feat(process): Make process/cluster .stop async
- fix(process): Make .start() return false if process/cluster is blocked
- fix(cluster): Do not autostart cluster instances by default
- fix(cluster): Make cluster status better reflect instance status, add status MIXED
- fix(cluster): Set cluster status to blocked if all instances are blocked
- chore: Improve test coverage
- chore(build): Add coverage html report, serve automatically using std/http/file_server on task `check-coverage`
- chore(deps): Update Deno std from `0.193.0` to `0.195.0`

## [1.0.0-rc.4] - 2023-07-18

- fix(process): Unref forced termination timer by passing `persistant: false` to delay, to prevent it for keeping the main process alive for the full duration of the timeout
- feature(web-interface): Add history to web interface log view
- chore(build): Add coverage task to `deno.json`

## [1.0.0-rc.3] - 2023-07-10

- feature(configuration): Add options `terminateTimeout` (default 30) and `terminateGracePeriod` (default 0) to both process and global scopes
- fix(service): Fix an issue where user mode ystemd services installed by pup did not start on boot by upgrading dependency `service`

## [1.0.0-rc.2] - 2023-07-06

- chore(deps): Update dependencies

## [1.0.0-rc.1] - 2023-07-04

- fix(cli): Read command from `--` correctly
- fix(core): Skip instant maintenance run to avoid problems on first run

## [1.0.0-rc.0] - 2023-07-02

Pup has now achieved enough stability to enter the Release Candidate phase. Here is a brief summary of the significant changes and enhancements implemented during the Beta phase:

- Major refactoring of the core modules was conducted to improve efficiency and stability.

- Several bug fixes were made in different parts of the software, especially in the process module, the worker runner, and the web interface plugin.

- The upgrader module underwent a significant revamp, introducing upgrade channels, support for initial installs and better error handling. We've also implemented more granular permission checks to
  align with the principle of least privilege. Pup now requests only the specific permissions necessary for each operation, enhancing overall security. Note that these security improvements only cover
  Pup, permissions of child processes must be taken care of explicitly as usual.

- New features added to web interface plugin, such as telemetry status, process status, and details of the selected process in the side bar.

- The logger module was improved by moving internal logs from temporary to persistent storage. Allowing for the new command `pup logs` which allow filtering using `--start/end <iso-time>`,
  `--severity <error|warn|...>` etc.

- A new maintenance loop was added to purge internal logs and status after a set number of hours.

- Breaking changes were introduced with the move to Deno KV for storing internal states and logs. This transition required a fresh install of Pup and the use of the --unstable-kv flag in Deno. If
  you're upgrading from an early version, run `pup upgrade --channel prerelease` twice to make sure you're all good.

- The load balancer module was enhanced with features for backend health tracking, error handling, and redirection.

- Significant enhancements were made to the CLI to improve functionality and user experience.

Moving forward, our focus will shift to bug hunting and overall stability improvements. We greatly appreciate any feedback from users during this final testing phase. Please be aware that while this
release candidate is close to the final version, it might still contain some bugs.

It's important to note that Pup can currently only operate with the --unstable-kv flag. However, this is automatically managed by the installer/upgrader. As soon as Deno stabilizes KV, the
--unstable-kv flag will be automatically removed during the upgrade process.

## [1.0.0-beta.37] - 2023-07-01

- refactor(core): Refactor and jsdoc improvements of several modules.
- fix(process): Add missing call to `setState()` on status change to `STOPPING`.
- chore(build): Full dependency update
- fix(core): Fix worker runner
- feature(upgrader): Use hardened permissions by default, allow override on setup/upgrade by `--all-permissions`

## [1.0.0-beta.36] - 2023-06-28

- feature(webinterface): Add process telemetry to sidebar.
- fix(webinterface): Hide unused elements while loading interface.
- fix(logger): Fix purging of logs

## [1.0.0-beta.35] - 2023-06-27

- fix(core): Decrease watchdog interval from 2000ms to 1000ms.
- fix(core): Write status history to internal store at most once per 20 seconds.
- fix(core): Assign exit signal 1 when child process makes an unclean exit.
- fix(core): Unref watchdog timer.
- fix(process-runner): Handle sub process errors more gracefully, do not print "Pipe error".
- refactor(core): Gather all core constants in configuration.ts
- refactor(webinterface): UI cleanup, move process state/config to sidebar, adjust colors etc.
- fix(webinterface): Do not throw on websocket send errors.
- docs(contributing): Add documentation on how to contribute in packaging Pup.

## [1.0.0-beta.34] - 2023-06-22

- fix(upgrader): Fix small regression bugs.

## [1.0.0-beta.33] - 2023-06-22

**A note on breaking changes**

This release contains breaking changes. Starting from this version, Deno KV is used for storing internal states and logs. Deno KV is an experimental feature that requires Deno to run with the
`--unstable-kv` flag.

You cannot update from a previous version using the built-in installer, as it would install Pup without the `--unstable-kv` flag. Instead, please follow the instructions for a fresh install in the
manual, and the old version of Pup will be overwritten.

From now on, the upgrader will check your installed Deno version and the need for using `--unstable-kv`, and it will act/suggest actions accordingly.

Also not that the `stable` installation channel will be empty until the first stable release. From now on, you will have to pass `--channel prerelease` when using the `setup` or `upgrade` commands.

## Changes

- **BREAKING** feature(upgrader): Support upgrade channels `stable`, `prerelease` and `canary`. Default to `stable`, select with `upgrade --channel <channel-name>`.
- **BREAKING** feature(status,logger): Use Deno KV instead of plain file, for keeping status and internal logs.
- fix(webinterface): Allow serving from sub-uri.
- fix(webinterface): Fix script error.
- chore(build): Add build step for bundling web interface assets.
- feature(webinterface): Add "toolbar" showing config/status details of selected process.
- chore(webinterface): Code refactor, convert js to esm etc.
- chore(webinterface): Add separate README.md (plugins/web-interface/README.md) with docs for developers/contributors.
- feature(logger): Move internal logs from temporary to persistent storage.
- feature(core): Add maintenance loop, currently purging internal logs and status after a set number of hours. Running every 15 minutes.
- feature(configuration): Add option to global logger `logger.internalLogHours` defaulting to 24.
- fix(upgrader): Refactor upgrader with various fixes. `use std/semver` instead of flawed logic. Add confirmation. Add changelog reference.
- feature(loadbalancer): Run load balancer-instances as separate workers instead of in main thread.
- fix(core): Allow core to shut down gracefully.
- feature(upgrader): Support fresh installs using the upgrader to select channels using `install [--channel <channel-name>] etc.`
- fix(core): Wrap Pup constructor in an static async factory function `new Pup()` -> `await Pup.init(...)` to avoid unawaited calls.

## [1.0.0-beta.32] - 2023-06-06

- Fix service uninstall.

## [1.0.0-beta.31] - 2023-06-06

- Update depency `hexagon/service`, resolves issue #27.

## [1.0.0-beta.30] - 2023-06-05

- docs: Fix typo on environment variable `PUP_CLUSTER_INSTANCE`
- deps: Full dependency update
- security: Use stricter security flags in build process (`deno task build`)
- chore: Improve the commenting of the code
- feature(loadbalancer): Periodically track backend health.
- feature(loadbalancer): Flag backend as down after 5 failed connections.
- feature(loadbalancer): Redirect clients to next alive backend on error.
- fix(loadbalancer): Use pup logging insted of console.log

## [1.0.0-beta.29] - 2023-06-04

- docs: Add Known Issues section in docs. Add Known Issue on problem stopping a managed process using `deno task`.
- docs: Remove stray outdated file `docs/resources/pup.schema.json`. Correct path is `docs/pup.schema.json`.
- docs: Add note on using "$schema" in `pup.json` for auto completion.
- docs: Upgrade Deno version in example Dockerfile.
- docs: Fix error in example Dockerfile.

## [1.0.0-beta.28] - 2023-06-03

- Refactor(cli): Cleanup of status output. Add column for blocked. Use local dates.
- Refactor(process): Remove process status BLOCKED, as it is a state independent of process status
- Fix(dax-runner): Handle exit code 124 (aborted by command stop) as process status FINISHED.

## [1.0.0-beta.27] - 2023-06-02

- Fix(config): Support $schema in pup.json
- Chore: Update std 0.180 -> 0.188

## [1.0.0-beta.26] - 2023-05-21

- Refactor(args): Simplify argument check
- Fix(loadbalancer): `least-connections` not used even if configured
- Refactor(tests): More consistent test names
- Fix(docs): Improve documentation on library usage
- Fix(cli): Remove debug console log
- Fix(build): Follow new flat convention of deno.json

## [1.0.0-beta.25] - 2023-05-16

- Fix: Find default config files in working directory when using `--cwd` without specifying `--config`
- Fix: Bugged cli <-> main process communication
- Fix: Make --terminate even more graceful

## [1.0.0-beta.24] - 2023-05-15

- Documentation fixes
- Improve IPC implementation (speed and security)
- Improve cleanup functions and graceful shutdown
- Show outcome when running cli commands `start`, `stop`, `block`, `...`
- Fix: `pup terminate` should not require specifying an process id

## [1.0.0-beta.23] - 2023-05-12

- Change: **BREAKING:** Process configuration entry `cmd:` now expects string (`deno run -A script.ts`) instead of array of strings (`["deno","run",...]`)
- Change: Use [dax](https://github.com/dsherret/dax) instead of `Deno.Command` to launch process, enabling shell functions and chaining of processes.
- Reduce `pup service install/uninstall/generate` to `pup install/uninstall [--dry-run]`

## [1.0.0-beta.22] - 2023-05-10

- Make `--` optional for `--help`, `--version` and `--upgrade`
- Bugfix: Always use config file
- Feature: Allow to configure process cluster/load balancer using cli run init and append
- Feature: Allow to configure process logger using cli
- Feature: Add command line argument logs, which show the logs of the current instance
- Refactor: Reorganize output of `pup help`
- Docs: Various documentation fixes
- Fix: Better error handling in Splunk HEC plugin
- Docs: Add example for the Splunk HEC plugin
- Cleanup: Remove non functional monitor plugin

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
