---
layout: page
title: 2. Installation
---

# 2. Installation

---

This section will guide you through the installation process of Pup.

## Prerequisites

Before proceeding with the installation, ensure that you have the following installed on your system:

Deno (version `1.30.x` or higher): You can install Deno by following the official Deno [instructions](https://deno.land/manual/getting_started/installation).

## Installing or upgrading Pup

To install or upgrade Pup, open your terminal and execute the following command:

```bash
deno install -Afr https://deno.land/x/pup/pup.ts
```

This command downloads the Pup executable and installs it on your system. The `A` flag grants all permissions, `f` overwrites any existing installation, and `r` ensures no cache is used.

After the installation is complete, you will see a message indicating the installation path of the Pup executable. To use the pup command from any location in your terminal, ensure the installation
path is added to your system's PATH environment variable.

## Verifying the Installation

To verify that Pup has been installed correctly, run the following command in your terminal:

```
pup --version
```

If Pup is installed successfully, you should see the current version number. Now you're ready to start using Pup to manage your processes.
