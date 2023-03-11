# Pup - Simple yet powerful Process Manager

Pup is a command-line tool that simplifies the management of processes. Pup can start, stop, restart, and keep processes alive, as well as schedule processes using a cron pattern. It does also manage
the logs of each process, gathering them into a single stdout or file, making it easy to monitor and analyze the output of your processes in one place.

In addition to serving as a stand alone process manager, Pup can also function as a [as a library](#library-usage), allowing you to seamlessly manage the internal process ecosystem of your
application.

Pup revolves around a single configuration file, by default named 'pup.jsonc', which control every aspect of the processes to be executed, their execution methods, and the handling of logging.

> **Note** Please note that Pup is currently in an early stage of development and may contain bugs or unexpected behavior. Use at your own risk.

## Installation

Latest version of pup can be installed using Deno with the following command:

`deno install -A -n pup https://deno.land/x/pup/pup.ts`

The -A flag grants all permissions needed for Pup to work properly. In case of Deno subprocesses, you can specify individual permissions for each process with the usual command line flags.

> **Note** Before using Pup, you need to have Deno installed on your system. You can download and install Deno with a single command following the instructions provided on the official website:
> https://deno.land/#installation

### Upgrading from a previous version

Passing `-fr` to the installation command will clear cache and upgrade pup to the latest version. `-A` grants all permission for pup to work properly.

`deno install -frA https://deno.land/x/pup/pup.ts`

## Usage

To start using Pup, you can simply run `pup` on the command line. This will use the default configuration file `pup.jsonc` located in the current directory.

If you want to use a different configuration file, you can pass the `--config` flag followed by the filename:

`pup --config myconfig.json`

Once Pup is running, it will read the configuration file and start the processes defined in it. You can also use Pup as a library within a Deno program to manage child processes.

While running, pup will keep track of current state in the file `myconfig.jsonc.status`. If you pass the flag `--status` to pup, it will print a summary on the console.

`pup --status` or `pup --config myconfig.json --status`

## Configuration

Pup is centered around a single configuration file called `pup.jsonc`. This file defines every aspect of the program, such as the processes to manage, how to start them, and when to restart them.

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

  // Process configuration - Required to be an array, and at least one process definition is required
  "processes": [
    // One object per process ...
    {
      "name": "kept-alive-server", // Required
      "cmd": ["deno", "run", "--allow-read", "./examples/basic/server.js"], // Required
      "cwd": "/path/to/workingdir", // default undefined
      "env": {  // default undefined
        "TZ": "Europe/Olso"
      },
      "autostart": true, // default undefined, process will not autostart by default
      // "cron": "*/5 * * * * *", // default undefined
      "restart": "always", // default undefined, possible values ["always" | "error" | undefined]
      "maxRestarts": 10, // default undefined - restart infinitely'
      "restartDelayMs": 10000, // default 10000
    },
    {
      "name": "periodic-example-task",
      "cmd": ["deno", "run", "--allow-read", "./examples/basic/task.js"],
      "cron": "*/5 * * * * *", // default undefined

      // Overrides to global logger
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

In this example, we define a process called `server-task`. We specify the command to start the process using an array of strings. We set it to start immediately, and to restart after 10 seconds after
quitting for whatever reason.

We also define a complementary process which is launched every 10 seconds using a cron pattern.

Full example available at [/examples/basic](/examples/basic)

**Running the example**

Change working dir to the example directory containg a couple of scripts and `pup.jsonc`

```
cd /examples/basic
```

Start pup by running the command `pup`. If you have not yet installed pup, you can run it from this repository like this.

```
deno run -A ../../pup.ts
```

server.js will start instantly, and will restart automatically 10 seconds after exiting. task.js will start every tenth second according to cron pattern `*/10 * * * * *`

**Output**

![Pup example logs](/docs/pup-logs.png "Pup example logs")

## Library usage

Import pup from your favorite cdn, we prefer [deno.land/x/pup](https://deno.land/x/pup).

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
pup.start()
```

### Custom logger

```ts
// Create a pup instance
const pup = new Pup() /* configuration */

// Create a custom logger
const logger = (severity: string, category: string, text: string, _config?: GlobalLoggerConfiguration, process?: ProcessConfiguration) => {
  // Initiator
  const initiator = process ? process.name : "core"

  // Custom log function
  console.log(`${initiator}(${severity}:${category}): ${text}`)

  // Block built in logger by returning true
  return true
}

// Attach the logger to pup
pup.logger.attach(logger)

pup.start()
```

## Contributions

Contributions to Pup are very welcome! Please read [CONTRIBUTING.md](/docs/CONTRIBUTING.md), fork the repository, make your changes, and submit a pull request. We appreciate all feedback and
contributions that help make Pup better.
