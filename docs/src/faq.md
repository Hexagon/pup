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

**Q: Can I run multiple ecosystems simultaneously?**

A: Yes, you can run multiple ecosystems simultaneously. However, it is essential to ensure that each instance has a separate configuration file and that they do not conflict with each other in terms
of process IDs or shared resources.

**Q: Is there a limit to the number of processes Pup can manage?**

A: There is no inherent limit to the number of processes Pup can manage. The actual limit depends on your system's resources and the complexity of your processes.
