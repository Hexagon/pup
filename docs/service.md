---
layout: page
title: " 5. Run at boot"
---

# 5. Run pup at boot

---

This section covers three options for running Pup at boot: using [Docker](#using-docker) (for Mac, Windows, and Linux), a [systemd user service](#using-a-systemd-user-service) (for Linux), and
[Launchd](#using-launchd-on-macos) (for macOS).

Docker is a platform for running applications in containers, and it is the preferred way of running Pup instances. Systemd and Launchd are service managers for Linux and macOS, respectively.

> **Note** If you just need to start a single process and keep it alive, you probably don't need Pup at all. Just follow these instructions and replace the command for Pup with your own application
> entrypoint.

## Using Docker

Docker is a platform for running applications in containers. A container is a lightweight, standalone, and executable package of software that includes everything needed to run an application. Docker
provides an easy way to package and distribute applications.

This works on all platforms (Mac, Windows and Linux), and is the preferred way of running pup instances.

1. Make sure to have a working `pup.json` in your current directory.

2. Add a file named `Dockerfile`

```
# Adjust this line to the deno version of your choice
FROM denoland/deno:debian-1.31.1

# This copies all files in the current working directory to /app in the
# docker image. 
RUN mkdir /app
COPY . /app/

# Install pup - Pin this url to a specific version in production
RUN ["deno","install","-Afr","pup", "https://deno.land/x/pup/pup.ts"]

# Go!
ENTRYPOINT ["sh", "-c", "cd /app && pup"]
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

## Using a systemd user service

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
ExecStart=/home/user/.deno/bin/deno run -A https://deno.land/x/pup/pup.ts --config /path/to/your/pup.json
Restart=always

[Install]
WantedBy=default.target
```

Make sure to replace `/home/user/.deno/bin/deno` with the actual path of your deno executable, which can be found by running `which deno` at the console.

You should also replace `/path/to/your/pup.json` with the actual path.

Finally you should add a version specifier to `https://deno.land/x/pup/pup.ts`, like `https://deno.land/x/pup@1.0.0-alpha-25/pup.ts`, Find the latest version at <https://deno.land/x/pup>.

Note that systemd always expects full paths.

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

## Using Launchd on macOS

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
