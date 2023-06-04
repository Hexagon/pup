---
layout: page
title: " 9. Troubleshooting"
---

# 9. Troubleshooting

---

## Known Issues

- **Unstoppable Processes using deno task**: Processes initiated via `deno task` can't be halted due to a known issue in the Deno/deno_task_shell (#33), which causes 'ghost' processes to remain active. As a workaround, we recommend always using `deno run ...` instead `of deno task ...`

## Common problems and their solutions

In this section, we will cover some common issues and their solutions when using Pup.

**Issue: Pup is not starting my process**

- Make sure that the process configuration is correct and valid.
- Ensure that the `autostart` property is set to `true` if you want the process to start automatically when Pup starts.
- Check the Pup logs for any error messages or warnings that might indicate the cause of the issue.

**Issue: My process is not restarting after a crash**

- Check if the `restart` property is set to either `"always"` or `"error"` in the process configuration.
- Verify that the number of restart attempts has not exceeded the `restartLimit` specified in the process configuration.
- Check the Pup logs for any error messages or warnings that might indicate the cause of the issue.

**Issue: Pup is not running my process at the specified cron schedule**

- Ensure that the cron pattern specified in the `cron` property is correct and valid.
- Verify that the process is not blocked by the `blocked` property or other constraints.
- Check the Pup logs for any error messages or warnings that might indicate the cause of the issue.

**Issue: Pup is not watching for changes in the specified directories**

- Make sure that the `watch` property is set correctly in the process configuration, and the specified directories exist.
- Verify that your system has the necessary permissions to access and monitor the specified directories.
- Check the Pup logs for any error messages or warnings that might indicate the cause of the issue.

If you still encounter any issues or need help with Pup, the following resources are available for troubleshooting and support:

1. **GitHub repository**: Check the [Pup GitHub repository](https://github.com/hexagon/pup) for any known issues or to report new ones. You can also participate in the Discussions section to seek help
   from the community.

2. **Documentation**: Thoroughly review this documentation to ensure you have correctly followed the installation, configuration, and usage instructions.

3. **Community**: Engage with the Pup community by asking questions or sharing your experiences and expertise. Collaboration and support are key to the success and growth of the project.

Remember, when reporting an issue, please provide as much detail as possible, including error messages, logs, and steps to reproduce the problem. This will help the maintainers and community members
in identifying and resolving the issue more efficiently.
