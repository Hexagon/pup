---
layout: page
title: Pup - The Manual
tagline: Test tagline
description: Test description
---

# Pup - Process Management Tool

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
  - [General flags](#general-flags)
  - [Configuring using the cli](#configuring-using-the-cli)
  - [Single command usage](#single-command-usage)
  - [The working directory](#working-directory)
- [Configuration](#configuration)
  - [Creating the Configuration File](#creating-the-configuration-file)
  - [Configuration Options](#configuration-options)
  - [Process configuration](#process-configuration)
    - [Start policy](#start-policy)
    - [Restart policy](#restart-policy)
  - [Global configuration](#global-configuration)
    - [Logger](#watcher)
    - [Watcher](#logger)
  - [Validating the Configuration](#validating-the-configuration)
  - [VS Code Intellisense](#vs-code-intellisense)
- [Library usage](#library-usage)
  - [Process Management](#process-management)
  - [Monitoring Process Information](#monitoring-process-information)
  - [Logging](#logging)
  - [File Watching](#file-watching)
  - [Cron Scheduling](#cron-scheduling)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
  - [Reporting bugs and requesting features](#reporting-bugs-and-requesting-features)
  - [Submitting code changes](#submitting-code-changes)
  - [Improving documentation](#improving-documentation)
  - [Helping other users](#helping-other-users)

## Introduction

Pup is a command-line tool that simplifies the management of processes. Pup can start, stop, restart, and keep processes alive, as well as schedule processes using a cron pattern. It does also manage
the logs of each process, gathering them into a single stdout or file, making it easy to monitor and analyze the output of your processes in one place.

Pup can also watch the filesystem, and restart processes when files change, similar to Nodemon and Denon.

In addition to serving as a stand alone process manager, Pup can also function as a [as a library](#library-usage), allowing you to seamlessly manage the internal process ecosystem of your
application.

Pup revolves around a single configuration file, by default named `pup.jsonc`, which control every aspect of the processes to be executed, their execution methods, and the handling of logging.

## Installation
This section will guide you through the installation process of Pup, the process management tool.

### Prerequisites
Before proceeding with the installation, ensure that you have the following installed on your system:

Deno (version 1.x or higher): You can install Deno by following the instructions on the official Deno website.

### Installing Pup
To install Pup, open your terminal and run the following command:

```bash
deno install -A --unstable -n pup https://deno.land/x/pup/mod.ts
```

This command downloads the Pup executable and installs it in your system. The `-A` flag grants all permissions, and the `--unstable` flag indicates that Pup relies on some unstable Deno APIs.

Once the installation is complete, you should see a message indicating the installation path of the Pup executable. Make sure the installation path is included in your system's PATH environment variable to use the pup command from anywhere in your terminal.

### Verifying the Installation
To verify that Pup has been installed correctly, run the following command in your terminal:

```
pup --version
```

If Pup is installed successfully, you should see the version number of the installed Pup tool. Now you're ready to start using Pup to manage your processes.

### Updating Pup

To update Pup to the latest version, simply re-run the installation command:

```
deno install -A --unstable -n pup https://deno.land/x/pup/mod.ts
```

This will overwrite the existing installation with the latest version of Pup.

## Usage

Pup offers various command line parameters to help you control its behavior. These parameters are grouped into general flags, init, append, and no-config options. In this section, we'll describe each group and provide examples of usage.

### General Flags

General flags are used to control the basic behavior of Pup and can be combined with other command line parameters.

- `-h, --help`: Display the help message with a list of available commands and options.
- `-v, --version`: Show the current version of Pup.

### Configuring using the cli

### Init

The `init` command is used to create a new configuration file with a single process entry. The following options are available:

**Basic settings**

- `--id <id>`: Specify the unique identifier for the process.
- `--cmd <cmd>`: Specify the command to run the process.
- `--cwd <cwd>` (optional): Set the working directory for the process.

**Start policy**

- `--cron <cron>` (optional): Set the cron schedule for the process.
- `--autostart <autostart>` (optional): Enable or disable autostart for the process (true or false).
- `--watch <watch>` (optional): Set a path to watch for changes, triggering a restart of the process.

Example:

```bash
pup init --id myprocess --cmd "node server.js" --cwd /path/to/project --cron "0 0 * * *" --autostart
```

More advanced options, like logging to file, or writing of pid files, are available by editing the configuration file manually.

### Append

The `append` command is used to add a new process entry to an existing configuration file. The options available for `init` are also applicable to the `append` command.

Example:

```bash
pup --append --id anotherprocess --cmd "python script.py" --cwd /path/to/another/project
```

> **Warning** When using `--append` to modify an existing configuration file, any comments will be stripped.

### Single command usage

The `--no-config` or `-n`option allows you to start a single process using command line parameters without reading or writing any configuration file. This mode uses default options for logging.

To run Pup in no-config mode, use the `--no-config` or `-n` flag, followed by a command and a restart policy. `id` is optional in this mode.

- `--cmd <cmd>`: Specify the command to run the process.

And one of the start policies

- `--cron <cron>` (optional): Set the cron schedule for the process.
- `--autostart <autostart>` (optional): Enable or disable autostart for the process (true or false).
- `--watch <watch>` (optional): Set a path to watch for changes, triggering a restart of the process.

Example:

```bash
pup --no-config --cmd "npm run server" --autostart
```

The same example, using short aliases for the command line parameters.

```bash
pup -nAc "npm run server"
```

### Working directory

The working directory of pup will always be the location of `pup.jsonc`, and relative paths in configuration will stem from there. You can override this per-process by supplying `--cwd` to the cli, or
using the option `cwd:` in the configuration.

## Configuration

In this section, you will learn how to create and manage configuration files for Pup.

To create a configuration file for Pup, first create a new file named `pup.json` in your project's root directory. You can also name it `pup.jsonc` if you want to use jsonc-style comments. Then, add the following basic structure to the file:

```json
{
  "processes": [
    {
      "id": "example",
      "cmd": ["deno", "run", "--allow-net", "app.ts"],
      "autostart": true
    }
  ]
}
```

This basic configuration defines a single process named example that runs a Deno script (app.ts) with the `--allow-net` flag. You can customize the configuration to suit your needs by adding more processes or updating the existing process definition.

### Process configuration

Here's a list of available configuration options for each process:

**General**

*   `id` (**required**): A unique identifier for the process.
*   `cmd` (**required**): An array containing the command and its arguments to run the process.
*   `cwd` (optional): The working directory for the process.
*   `env` (optional): An object containing environment variables for the process.
*   `pidFile` (optional): The path to the file where the process ID (PID) will be stored.
*   `timeout` (optional): A number specifying the maximum time (in seconds) that the process is allowed to run before it's terminated.
*   `overrun` (optional): A boolean indicating whether a new instance of the process is allowed to start if the previous instance is still running. Default: false.

**Start policy**

You need to specify one of these for each process, else the process will never start.

*   `autostart` (optional): A boolean indicating whether the process should start automatically when Pup starts. Default: false.
*   `cron` (optional): A cron expression specifying the schedule for the process to run.
*   `watch` (optional): An array of locations to watch for file changes. Process will start/restart when a file or directory changes.

**Restart policy**

*   `restart` (optional): A string specifying when the process should be restarted. Allowed values: "always" or "error".
*   `restartDelayMs` (optional): A number specifying the delay (in milliseconds) before restarting the process.
*   `restartLimit` (optional): A number specifying the maximum number of restarts allowed for the process.

#### Global configuration

Global configuration are entirely optional.

You can define global configuration options that apply to all processes. In addition to `processes: ` the global configuration clauses are:

*   `logger`: An object containing global logger configuration options.
*   `watcher`: An object containing global watcher configuration options.

##### Logger

The global logger configuration allows you to control the logging settings for pup, and the defaults of each process. To the global logger, include the following properties within your configuration file:

*   `console` (boolean): Set to true to enable logging to the console. Default is false.
*   `stdout` (string): The file path to write standard output logs.
*   `stderr` (string): The file path to write standard error logs.
*   `decorateFiles` (boolean): Set to true to enable decoration in the output files. Default is false.
*   `decorate` (boolean): **Only available in global scope.** Set to true to enable decoration in the logs. Default is false. 
*   `colors` (boolean): **Only available in global scope.** Set to true to enable colored output. Default is false. 

These options can be used in both the global scope logger, and for each process like:

```jsonc
{
  "logger": {
    "console": true,
    "stdout": "/path/to/stdout.log",
    "stderr": "/path/to/stderr.log",
    "colors": true,
    "decorateFiles": true,
    "decorate": true
  },
  "processes": [
    {
        "id": "my-process",
        /* ... */
        "logger": {
            "console": true,
            "stdout": "/path/to/process.stdout.log",
            "stderr": "/path/to/process.stderr.log",
            "decorateFiles": true
        }
    }
  ]
}
```

##### Watcher

The global watcher configuration allows you to control file watching settings for the entire library. To configure the global watcher, include the following properties within your configuration file:

*   `interval` (number): The interval (in milliseconds) at which the watcher checks for file changes. Default is 100.
*   `exts` (array of strings): The file extensions to watch. Default is ["ts", "tsx", "js", "jsx", "json"].
*   `match` (array of strings): The patterns to match for watched files. Default is ["**/*.*"].
*   `skip` (array of strings): The patterns to exclude from watching. Default is ["**/.git/**"].

Then enable watcher in the process configuration using `watch: ["paths","to","watch"]`. An example:

{
  "watcher": {
    "interval": 100,
    "exts": ["ts", "tsx", "js", "jsx", "json"],
    "match": ["**/*.*"],
    "skip": ["**/.git/**"]
  },
  "processes": [
    {
        "id": "my-process",
        /* ... */
        "watch": ["src/"]
    }
  ]
}

### Validating the Configuration

To ensure your configuration is valid, just run `pup`. If using pup as a library, can use the validateConfiguration() function provided by the `/lib/core/configuration.ts` file. This function checks if the configuration adheres to the schema and throws an error if it doesn't.

With a valid configuration in place, you're ready to use Pup to manage your processes.

### VS Code Intellisense

If you want Intellisense and code completion for `pup.json`/`pup.jsonc` in VS Code, you can append the pup json schema to `json.schemas` in your user settings or project settings (`.vscode/settings.json`).

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

## Library usage

### Process Management

Pup provides several methods for managing processes:

*   init(): Initializes the process. If a cron pattern is provided, the process will be scheduled accordingly. If the watch option is enabled, a watcher will be set up to monitor file changes.
*   start(reason: string, restart?: boolean): Starts the process. If the process is already running and overrun is not enabled, the start request will be ignored. If the maximum number of restarts is reached, the process will not be restarted.
*   stop(reason: string): Stops the process. If the process is not running, the stop request will be ignored.
*   block(): Prevents the process from being started.
*   unblock(): Allows the process to be started after it was previously blocked.
*   To manage processes, first import the Process class from /lib/core/process.ts. Then, create a new instance of the Process class, providing a Pup instance and a ProcessConfiguration object:

```ts
import { Process } from "/lib/core/process.ts"
import { Pup } from "/lib/core/pup.ts"
import { ProcessConfiguration } from "/lib/core/configuration.ts"

const pup = new Pup()
const processConfig: ProcessConfiguration = {
  id: "example",
  cmd: ["deno", "run", "--allow-net", "app.ts"]
}

const process = new Process(pup, processConfig)
```

With the Process instance, you can now use the methods mentioned above to manage your process:

```ts
// Initialize and start the process
process.init()
process.start("Manual start")

// Stop the process after some time
setTimeout(() => {
  process.stop("Manual stop")
}, 10000)
```

### Monitoring Process Information

To monitor the status of your processes, use the getStatus() method provided by the Process class. This method returns an object containing process information, such as the process ID, status, exit code, and start and exit times.

For example, you can log the status of a process like this:

```ts
const status = process.getStatus()
console.log(status)
```

By combining the various process management methods and monitoring techniques, you can build a powerful system for managing and monitoring your processes with Pup.

### Logging

Pup uses a custom logger to provide detailed logs about the processes being managed. You can configure the logger's behavior through the `logger` object in the configuration file.

There are two types of logger configurations: `GlobalLoggerConfiguration` and `ProcessLoggerConfiguration`. The global logger configuration applies to all processes managed, while the process logger configuration can be used to override the global settings for a specific process.

Here's an example of how to configure logging for Pup:

```ts
const configuration: Configuration = {
  logger: {
    console: true, // Log to console
    colors: true, // Use colors in logs
    decorateFiles: true, // Decorate log files
  },
  processes: [
    {
      id: "example",
      cmd: ["deno", "run", "--allow-net", "app.ts"],
      logger: {
        console: false, // Override global setting and disable console logging for this process
      },
    },
  ],
}
```

### File Watching

Pup can watch for file changes and automatically restart processes when changes are detected. This can be helpful during development when you want to automatically restart your application when you make changes to the source code.

To enable file watching, add a watch property to the ProcessConfiguration object:

```ts
const processConfig: ProcessConfiguration = {
  id: "example",
  cmd: ["deno", "run", "--allow-net", "app.ts"],
  watch: ["./src"], // Watch the "src" directory for changes
}
```

### Cron Scheduling

Pup supports scheduling processes to run at specific intervals using cron patterns. To set up a cron schedule for a process, add a cron property to the ProcessConfiguration object:

```ts
const processConfig: ProcessConfiguration = {
  id: "example",
  cmd: ["deno", "run", "--allow-net", "app.ts"],
  cron: "*/5 * * * *", // Run the process every 5 minutes
}
```

With these advanced features, you can further customize Pup's behavior to fit your needs and create a powerful process management system.

## FAQ

In this section, we will answer some frequently asked questions about Pup.

### Q: Can I use Pup with other programming languages?

A: Yes, Pup is a language-agnostic process manager. You can use it to manage processes written in any programming language. Just specify the command to execute in the `cmd` property of the `ProcessConfiguration` object.

> **Note** As a library, Pup is only available for Deno.

### Q: How do I handle environment variables?

A: You can pass environment variables to your processes using the `env` property in the `ProcessConfiguration` object. This property accepts an object where keys represent the environment variable names and values represent their corresponding values.

### Q: Can I run multiple instances of Pup simultaneously?

A: Yes, you can run multiple instances of Pup simultaneously. However, it is essential to ensure that each instance has a separate configuration file and that they do not conflict with each other in terms of process IDs or shared resources.

### Q: Is there a limit to the number of processes Pup can manage?

A: There is no inherent limit to the number of processes Pup can manage. The actual limit depends on your system's resources and the complexity of your processes.

## Troubleshooting

In this section, we will cover some common issues and their solutions when using Pup.

### Issue: Pup is not starting my process

- Make sure that the process configuration is correct and valid.
- Ensure that the `autostart` property is set to `true` if you want the process to start automatically when Pup starts.
- Check the Pup logs for any error messages or warnings that might indicate the cause of the issue.

### Issue: My process is not restarting after a crash

- Check if the `restart` property is set to either `"always"` or `"error"` in the process configuration.
- Verify that the number of restart attempts has not exceeded the `restartLimit` specified in the process configuration.
- Check the Pup logs for any error messages or warnings that might indicate the cause of the issue.

### Issue: Pup is not running my process at the specified cron schedule

- Ensure that the cron pattern specified in the `cron` property is correct and valid.
- Verify that the process is not blocked by the `blocked` property or other constraints.
- Check the Pup logs for any error messages or warnings that might indicate the cause of the issue.

### Issue: Pup is not watching for changes in the specified directories

- Make sure that the `watch` property is set correctly in the process configuration, and the specified directories exist.
- Verify that your system has the necessary permissions to access and monitor the specified directories.
- Check the Pup logs for any error messages or warnings that might indicate the cause of the issue.

If you still encounter any issues or need help with Pup, the following resources are available for troubleshooting and support:

1. **GitHub repository**: Check the [Pup GitHub repository](https://github.com/yourusername/pup) for any known issues or to report new ones. You can also participate in the Discussions section to seek help from the community.

2. **Documentation**: Thoroughly review this documentation to ensure you have correctly followed the installation, configuration, and usage instructions.

3. **Community**: Engage with the Pup community by asking questions or sharing your experiences and expertise. Collaboration and support are key to the success and growth of the project.

Remember, when reporting an issue, please provide as much detail as possible, including error messages, logs, and steps to reproduce the problem. This will help the maintainers and community members in identifying and resolving the issue more efficiently.

## Contributing

Pup is an open-source project, and we welcome contributions from the community. If you're interested in contributing to Pup, here are some ways you can get involved:

### Reporting bugs and requesting features

- If you encounter any issues or have a feature request, please create an issue on the project's GitHub repository.
- Provide a clear and concise description of the problem or feature, including steps to reproduce the issue if applicable.
- Attach any relevant logs, screenshots, or other information that can help in understanding and resolving the issue.

### Submitting code changes

- Fork the Pup repository on GitHub.
- Create a new branch for your changes and implement the desired feature or bug fix.
- Write tests to ensure your changes are reliable and maintainable.
- Update the documentation as needed to reflect your changes.
- Create a pull request against the main branch of the Pup repository, describing your changes and providing any necessary context.
- Address any feedback from the maintainers and make any requested changes.

### Improving documentation

- If you find any errors, inconsistencies, or areas that could benefit from clarification in the documentation, please create an issue or submit a pull request with the proposed changes.
- Ensure that your changes are clear, concise, and follow the existing documentation style.

### Helping other users

Assist other users by answering questions, providing guidance, or sharing your experiences and expertise. Primarily, Pup discussions take place in the GitHub repository, under Issues or Discussions sections.

We appreciate your interest in contributing to Pup and look forward to collaborating with you!