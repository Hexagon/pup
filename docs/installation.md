---
layout: page
title: 2. Installation
---

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

Once the installation is complete, you should see a message indicating the installation path of the Pup executable. Make sure the installation path is included in your system's PATH environment
variable to use the pup command from anywhere in your terminal.

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
