<br>
<p align="center">
<img src="https://cdn.jsdelivr.net/gh/hexagon/pup@master/docs/resources/pup_dark.png" alt="PUP"><br>
Universal process manager.<br><br>
This is the source code repository, documentation available at <a href="https://hexagon.github.io/pup">hexagon.github.io/pup</a>.
</p>
<br>

# Pup - The process manager

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

This readme is primarily for the source code and development of Pup, if you're looking for instructions you should head over to <https://hexagon.github.io/pup>

> **Note** Programmatic usage, process telemetry, and IPC are currently available only when running Deno client processes.

## Quick guide

**Install/Upgrade Pup using deno**

Before using Pup, you need to have Deno installed on your system. You can download and install Deno with a single command following the instructions provided on the official website:
<https://deno.land/#installation>

With Deno in place, open your terminal and execute the following command to install or upgrade Pup:

```bash
deno install -Afr https://deno.land/x/pup/pup.ts
```

This command downloads the Pup executable and installs it on your system. The `A` flag grants all permissions, `f` overwrites any existing installation, and `r` ensures no cache is used.

**Ecosystem example**

Use the cli helpers to initialise a new configuration file `pup.json`

`pup --init --id "my-server" --cmd "deno run -A server.ts" --autostart`

Add hourly task

`pup --append --id "my-task" --cmd "deno run -A task.ts" --cron "0 0 * * * *"`

Launch your ecosystem

`pup`

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
