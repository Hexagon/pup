---
layout: page
title: " 2. Installation"
---

# 2. Installation

---

This section will guide you through the installation process of Pup.

## Prerequisites

Before proceeding with the installation, ensure that you have the following installed on your system:

- Deno (version `1.30.x` or higher): You can install Deno by following the official Deno [instructions](https://deno.com/manual/getting_started/installation).

## Installing or upgrading Pup

To install Pup, open your terminal and execute the following command:

```bash
deno run -Ar https://deno.land/x/pup/pup.ts setup --channel prerelease
```

This command downloads the latest version of Pup and installs it on your system.

- The `-A` flag grants all permissions.
- The `-r` flag ensures no cache is used.
- The `--channel prerelease` option installs the pre-release version of Pup, as no stable version has been released yet.

If you already have Pup installed and want to upgrade to the latest version, you can use:

```bash
pup upgrade
```

Both the `setup` and `upgrade` commands support the following parameters:

- `--version`: Install, upgrade, or downgrade to a specific version.
- `--channel <channel>`: Defaults to stable, but you can also install the `prerelease` or `canary` channel.

The upgrader will check if your currently installed version of Deno is compatible with Pup and suggest an upgrade if necessary.

After the installation or upgrade is complete, you will see a message indicating the installation path of the Pup executable. To use the pup command from any location in your terminal, ensure that the
installation path is added to your system's PATH environment variable.

## Release channels

The available channels are:

- `stable`: This channel is currently empty, but will provide stable releases of Pup in the future. It is recommended for production environments where stability is a priority.

- `prerelease`: This channel offers pre-release versions of Pup that include new features and improvements. It is suitable for users who want to test the latest enhancements before they are officially
  released.

- `canary`: The canary channel provides the most up-to-date and cutting-edge versions of Pup. It includes the latest changes and may not be as stable as the other channels. It is primarily intended
  for developers and early adopters who want to stay on the bleeding edge of Pup's development. Based on the current state of the `main` repo of the github repository.

Each channel serves different purposes, so choose the one that best fits your needs and requirements.

## Verifying the Installation

To verify that Pup has been installed correctly, run the following command in your terminal:

```
pup --version
```

If Pup is installed successfully, you should see the current version number. Now you're ready to start using Pup to manage your processes.
