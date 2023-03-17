---
layout: page
title: "Appendix: Plugin development"
---

# Appendix: Developing plugins for Pup

***

> **Warning** The plugin interface is currently a Draft. Expect it to change!

The end user configuration for activating a plugin by `pup.json` is

```jsonc
{
    /* ... */
    "processes": [ /* ... */ ],
    "plugins": [
        /* Remote plugin */
        {
            "url": "https://deno.land/x/pup-example-plugin@0.0.1/mod.ts",
            "configuration": {
                /* Plugin specific configuration */
            }
        },
        /* Local plugin */
        {
            "url": "./plugins/app-plugin.ts",
            "configuration": {
                /* Plugin specific configuration */
            }
        }
    ]
}
```

Check out [/docs/examples/logger-plugin/main.ts](https://github.com/Hexagon/pup/tree/main/docs/examples/logger-plugin/main.ts) for a demo showing how to implement a custom logger.
