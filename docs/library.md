---
layout: page
title: " 7. Library usage"
---

# 7. Library usage

---

Pup can be integrated into your application. Simply import it from your preferred CDN. We recommend [deno.land/x/pup](https://deno.land/x/pup). Here's how you can set up your main script:

```ts
import { Configuration, Pup } from "https://deno.land/x/pup/mod.ts"

const configuration: Configuration = {
  "logger": {
    /* This is optional. If included, it can be used to specify custom logger settings */
  },
  "processes": [
    {/*...*/},
    {/*...*/},
  ],
}

const pup = await new Pup(configuration /* OPTIONAL: , statusFile */)

// Kickstart the pup instance
pup.init()
```

## Custom logger

Pup supports the integration of a custom logger. This allows for more flexible and adaptable logging, suitable to your specific requirements. Here's how you can implement it:

```ts
// Create a pup instance
const pup = new Pup() /* The configuration object is optional when instantiating a new Pup */

// Create a custom logger function
const logger = (severity: string, category: string, text: string, _config?: GlobalLoggerConfiguration, process?: ProcessConfiguration) => {
  // The initiator will be the process ID if a process is specified, otherwise it defaults to "core"
  const initiator = process ? process.id : "core"

  // Implement your custom log function here
  console.log(`${initiator}(${severity}:${category}): ${text}`)

  // Block the built-in logger by returning true. This prevents the built-in logger from logging the same message.
  return true
}

// Attach the custom logger to the Pup instance
pup.logger.attach(logger)

// Kickstart the pup instance
pup.init()
```
