---
title: "Packaging Pup"
nav_order: 2
parent: Contributing
---

## Packaging Pup

If you have experience with software packaging, your contribution can greatly enhance the accessibility of Pup across different platforms. Here's a simplified guide to packaging Pup:

- Create your package. Here are some important considerations:

  - Pup must be packaged to run using the command `pup`.

  - Pup can be compiled into an executable prior to packaging using `deno compile`. The procedure is described at
    [https://docs.deno.com/runtime/reference/cli/compiler/](https://docs.deno.com/runtime/reference/cli/compiler/). The command should be similar to
    `deno compile --allow-all --reload --output pup pup.ts --external-installer`.

  - The `--external-installer` argument to the Pup script disables the built-in installer, hiding `setup` and `upgrade` options from `--help`.

  - The `--allow-all` and `--reload` flags grant all permissions to Pup and ensure all dependencies use the most recent versions, respectively.

  - Pup should always be compiled using the latest Deno version when packaging.

  - Pup has a file in the repository root called `versions.json` specifying the latest version of each release channel, and version requirements.

- Test your package on the intended platform. Ensure that installation is seamless and all functionalities are performing as intended.

- After the package is ready, clone the Pup repository and create a new branch dedicated to your packaging work.

- Update the relevant documentation in `docs/`, including instructions for installing the package on your platform.

- Run `deno fmt` to make sure documentation is properly formatted.

- Once you're satisfied, create a pull request.
