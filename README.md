# Pup - Universal Process Manager

![PUP](https://cdn.jsdelivr.net/gh/hexagon/pup@master/docs/resources/pup_dark.png)

Pup is a powerful universal process manager developed with Deno, designed to keep your applications and services alive.

_For detailed documentation, visit [hexagon.github.io/pup](https://hexagon.github.io/pup)._

## Key Features

- **Process management**: Manage processes using CLI and/or a configuration file.
- **Start and restart policies**: Set up processes to start automatically, on a schedule (using cron expressions), or when files change, and configure restart behavior, either always or on errors,
  with optional delay and limits.
- **Service management**: Built-in installer for Linux (sysvinit, systemd, upstart), macOS, and Windows services.
- **Clustering and load balancing**: Built-in features for application scaling.
- **Logging**: Monitor and manage logs for your processes, with options for splitting, decoration, colors, and logging to files.
- **Configuration**: Configure global settings and per-process options, such as logging, directories, and environment variables.
- **Plugins**: Add custom plugins for more functionality and integrations.
- **CLI and API**: Use the command-line interface or integrate Pup into Deno applications.
- **Telemetry and IPC**: Collect data from Deno client processes and enable process communication.

> **Note**: Programmatic usage, process telemetry, and IPC are currently available only when running Deno client processes.

## Quick Start

### Installation

1. Install [Deno](https://deno.land/#installation) on your system.
2. Install or upgrade Pup using Deno:

```bash
# Install
deno install -Afr https://deno.land/x/pup/pup.ts

# Upgrade/Downgrade
pup --upgrade
```

This command downloads the Pup executable and installs it on your system. The `A` flag grants all permissions, `f` overwrites any existing installation, and `r` ensures no cache is used.

### Usage Examples

**Single command example**

Use `pup run` with `--cmd` and a restart policy, for example `--autostart`, this will keep your process running, and require no configuration.

`pup run --cmd "deno run server.ts" --autostart`

**Ecosystem example**

1. Initialise a new configuration file `pup.json`, running a server script using deno.

   `pup init --id "my-server" --cmd "deno run -A server.ts" --autostart`

2. Add hourly task using the cron start policy.

   `pup append --id "my-task" --cmd "deno run -A task.ts" --cron "0 0 * * * *"`

3. Launch your ecosystem.

   `pup run`

4. Optional: Install your ecosystem as a system service. Works systemd, sysvinit, upstart, launchd and Windows service manager.

   `pup service install --name my-service`

For the full manual, see <https://hexagon.github.io/pup>

## Example setups

Full examples available at [/docs/examples](/docs/examples)

## Contributions and Development

Contributions to Pup are very welcome! Please read [the contibuting section](https://hexagon.github.io/pup/contributing.html) of the manual, fork the repository, make your changes, and submit a pull
request.

We appreciate all feedback and contributions that help make Pup better!

### Examples of areas that need extra attention right now

- **Plugin development**: Invent new plugins for Pup, or help out by improving the existing (work in progress) web-interface plugin. See <https://hexagon.github.io/pup/examples/plugins/README.html> to
  get started.
- **Testing**: Pup needs to be thoroughly tested; help out by using and testing it in various scenarios. Report any issues you find.
- **Reading**: Review the documentation and report any issues or areas for improvement.
- **Bugfixes**: Find bugs, report them, and optionally create a PR to fix the issue.
- **Spread the word**: If you find Pup useful, spread the word to attract more users, developers, and testers to the community. Sharing your experiences and showcasing Pup's capabilities can help grow
  and strengthen the project.
