<br>
<p align="center">
<img src="https://cdn.jsdelivr.net/gh/hexagon/pup@master/docs/resources/pup_dark.png" alt="PUP"><br>
Universal process manager.<br><br>
This is the source code repository, documentation available at <a href="https://hexagon.github.io/pup">hexagon.github.io/pup</a>.
</p>

<br>

Pup is a powerful process manager for Deno, designed to simplify the management of your applications and services. Here are some of the key features of Pup:

- **Easy process management:** Define, control, and manage your processes with simple commands and configuration options.
- **Multiple start policies:** Set up processes to start automatically, on a schedule (using cron expressions), or when files change.
- **Restart policies:** Configure processes to restart automatically, either always or only in case of errors, with optional delay and restart limits.
- **Clustering and load balancing:** Easily scale your processes with built-in clustering and load balancing support.
- **Flexible configuration:** Define global settings and per-process configurations, including logging, working directories, environment variables, and more.
- **Plugin support:** Extend Pup's functionality with custom plugins for additional features and integrations.
- **CLI and programmatic usage:** Manage your processes using the Pup command-line interface, or integrate Pup directly into your Deno applications.
- **Process Telemetry:** Pup can collect telemetry data from client processes written in Deno, such as memory usage and current working directory. This can be used to provide better insights into the
  managed processes.

This readme is primarily for the source code and development of Pup, if you're looking for instructions you should head over to <https://hexagon.github.io/pup> **Install/Upgrade Pup using deno**

Before using Pup, you need to have Deno installed on your system. You can download and install Deno with a single command following the instructions provided on the official website:
<https://deno.land/#installation>

With Deno in place, open your terminal and execute the following command to install or upgrade Pup:

```bash
deno install -Afr https://deno.land/x/pup/pup.ts
```

This command downloads the Pup executable and installs it on your system. The `A` flag grants all permissions, `f` overwrites any existing installation, and `r` ensures no cache is used.

**Quick examples**

To keep a process alive forever, without configuration

`pup -n --cmd "deno run -A server.ts" --autostart` or with short flags `pup -nAC "deno run -A server.ts"`

To restart process on file changes, without configuration

`pup -n --cmd "deno run -A server.ts" --watch . or with short flags`pup -nC "deno run -A server.ts" -W .`

**Ecosystem example**

Use the cli helpers to initialise a new configuration file `pup.json`

`pup --init --id "my-server" --cmd "deno run -A server.ts" --autostart`

Add hourly task

`pup --append --id "my-task" --cmd "deno run -A task.ts" --cron "0 0 * * * *"`

Launch your ecosystem

`pup`

## Example setups

Full examples available at [/docs/examples](/docs/examples)

**Running the examples**

Taking `docs/examples/basic` as an example:

**If you have installed pup**

Start pup by running the command `pup --config docs/examples/basic/pup.jsonc`.

**If you have not yet installed pup**

Start pup by running the command `deno run -A pup.ts --config docs/examples/basic/pup.jsonc`.

Now `server.js` will start instantly, and will restart automatically 10 seconds after exiting. `task.js` will start every tenth second according to cron pattern `*/10 * * * * *`

**Output**

![Pup example logs](/docs/resources/pup-logs.png "Pup example logs")

## Library usage

Pup can also be built in in your application. Just import pup from your favorite cdn, we prefer [deno.land/x/pup](https://deno.land/x/pup), and set up your main script like this.

```ts
import { GlobalLoggerConfiguration, ProcessConfiguration, Pup } from "https://deno.land/x/pup/pup.ts"

const configuration = {
  "logger": {
    /* optional */
  },
  "processes": [
    {/*...*/},
    {/*...*/},
  ],
}

const pup = await new Pup(configuration /* OPTIONAL: , statusFile */)

// Go!
pup.init()
```

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

## Become a Sponsor

The goal of Pup is to be a unique and powerful universal process manager for Deno, and it's an open-source project. By becoming a sponsor, you'll help support the development and maintenance of Pup,
ensuring that it continues to improve and stay up-to-date with the latest technologies.

Your sponsorship will enable us to:

- Continue to develop new features and improve existing ones
- Maintain compatibility with the latest platforms
- Provide prompt bug fixes and support
- Create comprehensive documentation and examples for users

If you're interested in becoming a sponsor, please visit our [GitHub Sponsors page](https://github.com/sponsors/hexagon). You can also reach out to us directly at <hexagon@56k.guru> if you have any
questions or would like to discuss custom sponsorship options, including getting mentioned in the documentation.
