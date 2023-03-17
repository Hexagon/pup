---
layout: page
title: 6. Library usage
---

# 6. Library usage

Pup can be build in in your application. Just import from your favorite cdn, we prefer [deno.land/x/pup](https://deno.land/x/pup), and set up your main script like this.

```ts
import { GlobalLoggerConfiguration, ProcessConfiguration, Pup } from "https://deno.land/x/pup/pup.ts"

const configuration = {
  "logger": {
    /* optional */
  },
  "processes": [
    {/*...*/},
    {/*...*/},
  ],
}

const pup = await new Pup(configuration /* OPTIONAL: , statusFile */)

// Go!
pup.init()
```

## Custom logger

Pup supports plugging in an custom logger, use like this:

```ts
// Create a pup instance
const pup = new Pup() /* configuration */

// Create a custom logger
const logger = (severity: string, category: string, text: string, _config?: GlobalLoggerConfiguration, process?: ProcessConfiguration) => {
  // Initiator
  const initiator = process ? process.id : "core"

  // Custom log function
  console.log(`${initiator}(${severity}:${category}): ${text}`)

  // Block built in logger by returning true
  return true
}

// Attach the logger to pup
pup.logger.attach(logger)

pup.init()
```
