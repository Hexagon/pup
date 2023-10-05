---
title: "Run at boot"
parent: Usage
nav_order: 3
---

# Run pup at boot

---

This section covers three options for running Pup at boot: using [Docker](#using-docker) (for Mac, Windows, and Linux),systemd/sysvinit/docker-init/upstart (for Linux), and
[Launchd](#using-launchd-on-macos) (for macOS).

## Using the CLI

Follow the guide below to install Pup as a system service and launch at boot. The service installer supports Linux (systemd, sysvinit, upstart), Windows and macOS.

### Prerequisites

Ensure that you have a working environment set up so that you can run `pup run` with a `pup.json` in the current directory, or that you can start Pup using `pup run --config path/to/pup.json`.

Now there is two options, User Mode Installation, or System Installation. User Mode Installation is recommended as it rhymes best with Deno, which is installed for the current user. User mode is only
supported with launchd or systemd.

### User Mode Installation

> **Note** This mode is only supported with systemd or launchd, but will work witout root privileges. { .note }

1. If using systemd, enable `linger` for your user to run user services without being logged in:

`sudo loginctl enable-linger username`

Replace `username` with your actual username.

2. Install Pup as a user mode service, named `pup`:

`pup install`

To install multiple services, provide a unique name for each instance:

`pup install --name my-service`

### System Mode Installation

**Note**: This method works for all service managers, but may include some manual steps, and will require privileged access (e.g. sudo).

1. Install Pup as a system service, by default named `pup`:

`pup install --system`

To install multiple services, provide a unique name for each instance:

`pup install --system --name my-service`

2. Follow the on-screen instructions to copy the generated configuration file to the correct location, and enable the service.

### Service Argument Reference

Use the `pup <method> [...flags]` command with the following methods and flags:

- Methods:
  - `install`: Installs the configured Pup instance as a system service, then verifies the installation by enabling and starting the service. Rolls back any changes on error.
  - `uninstall`: Uninstall service

- Flags:
  - `--config`: Specifies the configuration file for the instance to be installed, defaulting to `pup.json` or `pup.jsonc` in the current directory.
  - `--dry-run`: Generates the configuration and prints it to stdout along with a suitable path. Makes no changes to the system.
  - `--name`: Sets the service name, defaulting to `pup`.
  - `--system`: Installs the service at the system level, with the default being user level.
  - `--home`: Specifies a home directory, defaulting to the current user's $HOME.
  - `--user`: Specifies a user other than the current user, only used in system-mode.
  - `--cwd`: Specifies a working directory other than the default, defaulting to the location of `pup.json`.
  - `--env`: Specifies environment variables to be passed to the service, in the format `KEY=VALUE`. Multiple variables can be passed by using the flag multiple times, e.g.,
    `-e KEY1=VALUE1 -e KEY2=VALUE2`.

## Using Docker

Docker is a platform for running applications in containers. A container is a lightweight, standalone, and executable package of software that includes everything needed to run an application. Docker
provides an easy way to package and distribute applications.

This works on all platforms (Mac, Windows and Linux), and is the preferred way of running pup instances.

1. Make sure to have a working `pup.json` in your current directory.

2. Add a file named `Dockerfile`

```
# Adjust this line to the deno version of your choice
FROM denoland/deno:debian-1.34.1

# This copies all files in the current working directory to /app in the
# docker image. 
RUN mkdir /app
COPY . /app/

# Install pup - Pin this url to a specific version in production
RUN ["deno","install","-Afrn","pup", "https://deno.land/x/pup/pup.ts"]

# Go!
ENTRYPOINT ["sh", "-c", "cd /app && pup run"]
```

Build the Docker image using the following command:

```
docker build -t my-pup-image .
```

This will build a Docker image named `my-pup-image` using the Dockerfile in the current directory.

```
docker run -d --restart=always --name my-pup-container my-pup-image
```

This will start a Docker container named my-pup-container using the my-pup-image image. The container will be started in the background (`-d`), and it will be restarted automatically if it fails
(`--restart=always`).

## Manual guide using systemd

### Installing a systemd user service

Systemd is a system and service manager for Linux. It provides a way to manage system services and daemons. As Deno and Pup are installed per-user, we will make use of the systemd user mode, which
will keep all configuration withing your home directory.

### Steps

First, make sure `linger` is enabled for your user. This will make user services run without being logged in.

`sudo loginctl enable-linger username`

Replace `username` with your username.

Then, make sure the directory `~/.config/systemd/user` exists by running

```
mkdir -p ~/.config/systemd/user
```

Then, create a Pup service file in the `~/.config/systemd/user` directory. The service file could be named `pup.service`, and it should look like this:

```ini
[Unit]
Description=Pup
After=network.target

[Service]
ExecStart=/home/user/.deno/bin/deno run -A https://deno.land/x/pup/pup.ts run --config /path/to/your/pup.json
Restart=always

[Install]
WantedBy=default.target
```

Make sure to replace `/home/user/.deno/bin/deno` with the actual path of your deno executable, which can be found by running `which deno` at the console.

You should also replace `/path/to/your/pup.json` with the actual path.

Finally you should add a version specifier to `https://deno.land/x/pup/pup.ts`, like `https://deno.land/x/pup@$PUP_VERSION/pup.ts`, Find the latest version at <https://deno.land/x/pup>.

Note that systemd always expects full paths. Also note that you will need to use full paths to executables in pup.json when running using systemd, alternatively you can use the `path` configuration
key in each process to add the paths needed, like:

```json
{
  "id": "my task",
  "path": "/home/<user>/.deno/bin/",
  "cmd": "deno run -A script.ts"
  /* ... */
}
```

Reload systemd user configuration using the following command:

```
systemctl --user daemon-reload
```

This will reload the systemd user configuration to include the new Pup service file.

Start the Pup service using the following command:

```
systemctl --user start pup
```

This will start the Pup service. Now check that everything is working.

```
systemctl --user status pup
```

If you want more details or full logs, you can run journalctl

```
journalctl --user -u pup
```

If you need to make any changes, run `daemon-reload` and `restart`, then check the logs again.

Enable the Pup service to start at boot using the following command:

```
systemctl --user enable pup
```

## Manual guide using launchd

Launchd is a system and service manager for macOS. It provides a way to manage system services and daemons. As Deno and Pup are installed per-user, we will make use of the launchd user mode, which
will keep all configuration withing your home directory, and avoid any need for root privileges.

### Steps

Create a Pup property list (plist) file in the ~/Library/LaunchAgents directory. The plist file should be named com.mycompany.pup.plist, and it should look like this:

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" 
"http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.mycompany.pup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>pup</string>
    <string>run</string>
    <string>--config</string>
    <string>/path/to/your/pup.json</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
</dict>
</plist>
```

Load the Pup plist file using the following command:

`launchctl load ~/Library/LaunchAgents/com.mycompany.pup.plist`

This will load the Pup plist file into launchd.

Start the Pup service using the following command:

`launchctl start com.mycompany.pup`

This will start the Pup service.

Enable the Pup service to start at boot using the following command:

`launchctl enable user/com.mycompany.pup`

This will enable the Pup service to start at boot.
