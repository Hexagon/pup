---
title: "FAQ"
nav_order: 8
---

# FAQ

---

In this section, we will answer some frequently asked questions about Pup.

**Q: Can I use Pup with other programming languages?**

A: Yes, Pup is a language-agnostic process manager. You can use it to manage processes written in any programming language. Just specify the command to execute in the `cmd` property of the
`ProcessConfiguration` object.

> **Note** As a library, Pup is only available for Deno. { .note }

**Q: How do I handle environment variables?**

A: You can pass environment variables to your processes using the `env` property in the `ProcessConfiguration` object. This property accepts an object where keys represent the environment variable
names and values represent their corresponding values.

**Q: Can I run multiple instances simultaneously?**

A: Yes, you can run multiple instances simultaneously. By default, each instance will use a separate port for the internal Rest API used when issueing cli commands.

**Q: Is there a limit to the number of processes Pup can manage?**

A: There is no inherent limit to the number of processes Pup can manage. The actual limit depends on your system's resources and the complexity of your processes.
