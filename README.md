<br>
<p align="center">
<img src="https://cdn.jsdelivr.net/gh/hexagon/pup@master/docs/resources/pup_dark.png" alt="PUP"><br>
Universal process manager.<br><br>
This is the source code repository, documentation available at <a href="https://hexagon.github.io/pup">hexagon.github.io/pup</a>.
</p>

<br>

**Install/Upgrade Pup using deno**

Before using Pup, you need to have Deno installed on your system. You can download and install Deno with a single command following the instructions provided on the official website:
<https://deno.land/#installation>

With Deno in place, open your terminal and execute the following command to install or upgrade Pup:

```bash
deno install -Afr https://deno.land/x/pup/pup.ts
```

This command downloads the Pup executable and installs it on your system. The `A` flag grants all permissions, `f` overwrites any existing installation, and `r` ensures no cache is used.

**Quick examples**

To keep a process alive forever, without configuration

`pup -n --cmd "deno run -A server.ts" --autostart`

To restart process on file changes, without configuration

`pup -n --cmd "deno run -A server.ts" --watch .

**Ecosystem example**

Initialise configuration file `pup.json`

`pup --init --id "my-server" --cmd "deno run -A server.ts" --autostart`

Add hourly task

`pup --append --id "my-task" --cmd "deno run -A task.ts" --cron "0 0 * * * *"`

Launch your ecosystem

`pup`

# Pup - Universal process manager

> **Note** Please note that Pup is currently in an early stage of development and may contain bugs or unexpected behavior. Use at your own risk.

## Usage

To start using Pup, you can simply run `pup` on the command line. This will use the default configuration file `pup.jsonc` located in the current directory.

If you want to use a different configuration file, you can pass the `--config` flag followed by the filename:

`pup --config myconfig.json`

Once Pup is running, it will read the configuration file and start the processes defined in it. You can also use Pup as [a library](#library-usage) within a Deno program to manage child processes.

While running, pup will keep track of current state in the file `myconfig.jsonc.status`. If you pass the flag `--status` to pup, it will print a summary on the console.

`pup --status` or `pup --config myconfig.json --status`

## Configuration

Pup is centered around a single configuration file called `pup.jsonc`. This file defines every aspect of the program, such as the processes to manage, how to start them, and when to restart them.

You can either create the file manually, with help from the full configuration example below, or use the command line to initialize and modify your configuration.

> **Note** Using the cli to modify your configuration **will** remove any jsonc comments

**To create a new pup.jsonc**

With a forever running task

`pup --init --id my-server --cmd "deno run server.js" --autostart`

... or a periodic task running 12 o'clock every day

`pup --init --id my-periodic-task --cmd "deno run task.js" --cron "0 0 12 * * *"`

**Add a task to an existing configuration**

`pup --append --id my-new-task --cmd "deno run additional.js" --autostart`

**To remove a task**

`pup --remove --id my-new-task`

**The working directory**

The working directory of pup will always be the location of `pup.jsonc`, and relative paths in configuration will stem from there. You can override this per-process by supplying `--cwd` to the cli, or
using the option `cwd:` in the configuration.

### Full configuration example

Here's an example of a `pup.jsonc` with all possible options defined:

```jsonc
{
  // Global logger configuration, all options can be ovverridden per process
  "logger": {
    // Decorate console log entries?
    "decorate": true, // default true

    // Use colors in console?
    "colors": true, // default true

    // Decorate log file entries?
    "decorateFiles": true, // default true

    // Write logs to files, if stderr is undefined it will default to the stdout file
    "stdout": "pup.log", // default undefined
    "stderr": "pup.error.log" // default undefined or stdout, if defined
  },

  // Configure file watcher, enabled by adding `watch: true` to the process config
  // This whole clause is optional and will default to the values listed
  "watcher": {
    "interval": 350, // default 350
    "exts": ["ts", "tsx", "js", "jsx", "json"], // defaults to ["ts", "tsx", "js", "jsx", "json"]
    "match": ["**/*.*"], // defaults to ["**/*.*"]
    "skip": ["**/.git/**"] // defaults to "**/.git/**"
  },

  // Process configuration - Required to be an array, and at least one process definition is required
  "processes": [
    // One object per process ...
    {
      "id": "kept-alive-server", // Required
      "cmd": ["deno", "run", "--allow-read", "./examples/basic/server.js"], // Required
      "cwd": "/path/to/workingdir", // default undefined
      "pidFile": "/path/to/pidfile", // default undefined
      "env": { // default undefined
        "TZ": "Europe/Olso"
      },
      "autostart": true, // default undefined, process will not autostart by default
      "overrun": false, // allow overrun, default false
      // "cron": "*/5 * * * * *", // default undefined
      "restart": "always", // default undefined, possible values ["always" | "error" | undefined]
      "restartLimit": 10, // default undefined - restart infinitely'
      "restartDelayMs": 10000, // default 10000
      // Only needed if you want to overrides the global logger
      // Note: "colors" is not configurable per process
      "logger": {
        "console": true, // defaults to global configuration or true
        "decorateFiles": true, // defaults to global configuration or false
        "stdout": "periodic-example-task.log",
        "stderr": "periodic-example-task.error.log"
      }
    }
  ]
}
```

In this example, we define a process called `server-task`. We specify the command to start the process using an array of strings. We set it to start immediately with, and to restart after 10 seconds
after quitting for whatever reason.

If you use the line `cron: "<pattern>"` instead of `autostart: true` it would be triggered periodically.

### VS Code Intellisense for pup.jsonc

If you want Intellisense and code completion for `pup.jsonc` in VS Code, you can append the pup schema to `json.schemas` in your user settings/`.vscode/settings.json`.

It should look something like this:

```jsonc
{
  "json.schemas": [
    {
      "fileMatch": [
        "/pup.json",
        "/pup.jsonc"
      ],
      "url": "https://deno.land/x/pup/docs/pup.schema.json"
    }
  ]
}
```

## Examples

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

Pup can also be build in in your application. Just import pup from your favorite cdn, we prefer [deno.land/x/pup](https://deno.land/x/pup), and set up your main script like this.

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

### Custom logger

```ts
// Create a pup instance
const pup = new Pup() /* configuration */

// Create a custom logger
const logger = (severity: string, category: string, text: string, _config?: GlobalLoggerConfiguration, process?: ProcessConfiguration) => {
  // Initiator
  const initiator = process ? process.id : "core"

  // Custom log function
  console.log(`${initiator}(${severity}:${category}): ${text}`)

  // Block built in logger by returning true
  return true
}

// Attach the logger to pup
pup.logger.attach(logger)

pup.init()
```

## Contributions

Contributions to Pup are very welcome! Please read [the contibuting section](/docs/MANUAL.md#contributing) of the manual, fork the repository, make your changes, and submit a pull request. We
appreciate all feedback and contributions that help make Pup better.

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
