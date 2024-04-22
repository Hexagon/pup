# Pup - Universal Process Manager

![PUP](https://cdn.jsdelivr.net/gh/hexagon/pup@master/docs/src/resources/pup_dark.png)

Pup is a powerful universal process manager developed with Deno, designed to keep your applications and services alive.

_For detailed documentation, visit [pup.56k.guru](https://pup.56k.guru)._

## Key Features

- **Cross-platform and wide OS compatibility:** Manage processes across different platforms and languages, including Deno, Node.js, Python, and Ruby, on Windows, macOS, and Linux.
- **Process management:** Define, control, and manage your processes with simple commands and configuration options.
- **Multiple start/restart policies:** Set up processes to start automatically, on a schedule (using cron expressions), or when files change.
- **Service management**: Built-in installer for Linux (sysvinit, systemd, upstart), macOS, and Windows services.
- **Clustering and load balancing:** Seamlessly scale your applications with built-in clustering and load balancing capabilities.
- **Plugins:** Extend Pup's functionality with custom plugins, such as the [Splunk HEC plugin](/docs/src/examples/splunk/README.md) for seamless integration with Splunk and the
  [Web Interface plugin](/docs/src/examples/basic-webinterface/README.md) for an intuitive graphical user interface. Create your own plugins to add additional features and integrations tailored to
  your needs.
- **Process Telemetry and IPC:** Gain deeper insights into managed processes by gathering telemetry data, such as memory usage and current working directory, from Deno client processes. Supports
  inter-process communication for connected processes to interact with each other.
- **Secure Rest API:** Control and monitor Pup from third party solutions using the build in Rest API.

> **Note**: Programmatic usage, process telemetry, and IPC are currently available only when running Deno client processes.

## Quick Start

### Installation

To install Pup, open your terminal and execute the following command:

```bash
deno run -Ar jsr:@pup/pup@1.0.0-rc.29 setup --channel prerelease
```

This command downloads the latest version of Pup and installs it on your system. The `--channel prerelease` option is included as there is no stable version of Pup yet. Read more abour release
channels [here](https://hexagon.github.io/pup/installation.html#release-channels).

### Configuration and Usage

Pup revolves around instance configuration files, where each managed process belongs to an instance defined by a `pup.json`. This file can either be created manually, or by the command line helpers
used below:

1. To create a simple instances running a single process:

   `pup init --id "my-server" --autostart --cmd "deno run -A server.ts"`

   If you intend to create multiple pup instances on the same server, you can pass an instance name through `--name my-instance-name`. This name will also be used as the system service name.

2. _(Optional)_ In case you have an additional task to execute, such as a cleanup script, you can make use of `pup append`. The following example shows how to add an extra task that use the cron start
   policy:

   `pup append --id "my-task" --cmd "deno run -A task.ts" --cron "0 0 * * * *"`

3. _(Optional)_ Test your instance by running it foreground using `pup run` (exit by pressing CTRL+C):

4. To make your instance run at boot, enable it using `pup enable-service`.

   Will by default use the instance name for service name, which defaults to `pup`. You can override by passing `-n my-custom-name`.

5. To stream the logs from a running instance, use the command `pup monitor`. To show historic logs, use `pup logs`.

   Will by default use the instance name for service name, which defaults to `pup`. You can override by passing `-n my-custom-name`.

For the full manual, see <https://pup.56k.guru>

#### Single command example

It is also possible to use pup to keep a process alive temporary, without a `pup.json` or system service.

To achieve this, use `pup run` with `--cmd` and a start policy.

`pup run --autostart --cmd "deno run server.ts"`

## Example setups

Full examples available at [/docs/src/examples](/docs/src/examples)

## Release channels

- `stable`: This channel is currently empty, but will provide stable releases of Pup in the future. It is recommended for production environments where stability is a priority.

- `prerelease`: This channel offers pre-release versions of Pup that include new features and improvements. It is suitable for users who want to test the latest enhancements before they are officially
  released.

- `canary`: The canary channel provides the most up-to-date and cutting-edge versions of Pup. It includes the latest changes and may not be as stable as the other channels. It is primarily intended
  for developers and early adopters who want to stay on the bleeding edge of Pup's development. Based on the current state of the `main` repo of the github repository.

> **Note** Built-in plugins, such as splunk-hec and webinterace does not work with canary versions right now.

Each channel serves different purposes, so choose the one that best fits your needs and requirements.

## Contributions and Development

Contributions to Pup are very welcome! Please read [the contributing section](https://pup.56k.guru/contributing.html) of the manual, fork the repository, make your changes, and submit a pull request.

We appreciate all feedback and contributions that help make Pup better!

### Examples of areas that need extra attention right now

- **Plugin development**: Invent new plugins for Pup, or help out by improving the existing (work in progress) web-interface plugin. See <https://pup.56k.guru/examples/plugins/README.html> to get
  started on plugin development in general. See <https://github.com/Hexagon/pup/blob/main/plugins/web-interface/README.md> for instructions on how to rebuild the web-interface.
- **Testing**: Pup needs to be thoroughly tested; help out by using and testing it in various scenarios. Report any issues you encounter.
- **Reading**: Review the documentation and report any issues or areas for improvement.
- **Bugfixes**: Find bugs, report them, and optionally create a PR to fix the issue.
- **Spread the word**: If you find Pup useful, spread the word to attract more users, developers, and testers to the community. Sharing your experience and showcasing Pup's capabilities can help grow
  and strengthen the project.
