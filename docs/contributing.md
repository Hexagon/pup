---
layout: page
title: "10. Contributing"
---

# 10. Contributing

---

Pup is an open-source project, and we welcome contributions from the community. If you're interested in contributing to Pup, here are some ways you can get involved:

## Packaging Pup

If you have experience with software packaging, your contribution can greatly enhance the accessibility of Pup across different platforms. Here's a simplified guide to packaging Pup:

- Create your package. Here are some important considerations:

  - Pup must be packaged to run using the command `pup`.

  - Pup can be compiled into an executable prior to packaging using `deno compile`. The procedure is described at
    [https://deno.com/manual@v1.34.3/tools/compiler](https://deno.com/manual@v1.34.3/tools/compiler). The command should be similar to
    `deno compile --allow-all --reload --unstable --output pup pup.ts -- --external-installer`. The `--unstable` flag should be included if the version you are packaging (mostly pre-releases) requires
    unstable features according to `versions.json`.

  - The `--external-installer` argument to the Pup script disables the built-in installer, hiding `setup` and `upgrade` options from `--help`.

  - The `--allow-all` and `--reload` flags grant all permissions to Pup and ensure all dependencies use the most recent versions, respectively.

  - Pup should always be compiled using the latest Deno version when packaging.

  - Pup has a file in the repository root called `versions.json` specifying the latest version of each release channel, and version requirements.

- Test your package on the intended platform. Ensure that installation is seamless and all functionalities are performing as intended.

- After the package is ready, clone the Pup repository and create a new branch dedicated to your packaging work.

- Update the relevant documentation in `docs/`, including instructions for installing the package on your platform.

- Run `deno fmt` to make sure documentation is properly formatted.

- Once you're satisfied, create a pull request.

## Reporting bugs and requesting features

- If you encounter any issues or have a feature request, please create an issue on the project's GitHub repository.
- Provide a clear and concise description of the problem or feature, including steps to reproduce the issue if applicable.
- Attach any relevant logs, screenshots, or other information that can help in understanding and resolving the issue.

## Submitting code changes

- Fork the Pup repository on GitHub.
- Create a new branch for your changes and implement the desired feature or bug fix.
- Write tests to ensure your changes are reliable and maintainable.
- Update the documentation as needed to reflect your changes.
- Run `deno task build` to check format, lint and test the code.
- Create a pull request against the main branch of the Pup repository, describing your changes and providing any necessary context.
- Address any feedback from the maintainers and make any requested changes.

## Improving documentation

- If you find any errors, inconsistencies, or areas that could benefit from clarification in the documentation, please create an issue or submit a pull request with the proposed changes.
- Ensure that your changes are clear, concise, and follow the existing documentation style.

## Helping other users

Assist other users by answering questions, providing guidance, or sharing your experiences and expertise. Primarily, Pup discussions take place in the GitHub repository, under Issues or Discussions
sections.

We appreciate your interest in contributing to Pup and look forward to collaborating with you!
