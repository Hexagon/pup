---
title: "Plugin development"
parent: Contributing
nav_order: 2
---

# Plugin development

---

### Getting started

To create a custom plugin, developers should extend the `PluginImplementation` class and override its methods as necessary. This class is the main entry point for plugins to interact with Pup and
provides various hooks and events to listen for.

```typescript
import { LogEvent, PluginApi, PluginConfiguration, PluginImplementation, PluginMetadata } from "jsr:@pup/pup@$VERSION/mod.ts"

export class PupPlugin extends PluginImplementation {
  constructor(pup: PluginApi, config: PluginConfiguration) {
    super(pup, config)
    this.meta = {
      name: "MinimalPlugin",
      version: "1.0.0",
      api: "1",
      repository: "https://github.com/hexagon/pup",
    }
  }
}
```

Now, to communicate with pup, there are three concepts

## Hooks

Hooks are a way for plugins to intercept and modify the behavior of Pup. To use a hook, a plugin must implement the hook method and handle the relevant signals. Currently, only the `log` hook is
supported.

## Events

Events allow plugins to listen for specific occurrences within Pup. Plugins can subscribe to events using the events property of the PluginApi class.

The following events are available:

- **log:** Fired when a log event occurs.
- **init:** Fired when Pup initializes.
- **watchdog:** Fired when the watchdog timer triggers.
- **process_status_changed:** Fired when a process's status changes.
- **process_scheduled:** Fired when a process is scheduled to run.
- **process_watch:** Fired when a process's watch configuration triggers a restart.
- **terminating:** Fired when Pup is terminating.
- **ipc:** Fired when an IPC message is received.

## PluginApi

The PluginApi class is the main API for interacting with Pup from a plugin. It exposes methods for managing processes and listening to events, the class also exposes some paths that may be useful for
plugins:

To use the PluginApi, access it through the pup parameter in your custom plugin's constructor:

```ts
class PupPlugin extends PluginImplementation {
  constructor(pup: PluginApi, config: PluginConfiguration) {
    // Use the pup PluginApi instance to interact with pup

    // - Start, stop, restart, block, and unblock processes:
    pup.start(id, reason)
    pup.stop(id, reason)
    pup.restart(id, reason)
    pup.block(id, reason)
    pup.unblock(id, reason)

    // - Terminate Pup:
    pup.terminate(forceQuitMs)

    // - Get the status of all processes:
    const ProcessStatees = pup.allProcessStatees()

    // Listen to events using the pup.events property:
    pup.events.on("process_status_changed", (eventData) => {
      console.log("Process status changed:", eventData)
    })

    // Extract usable paths:
    // - A path to temporary storage that can be used by the plugin.
    const tempStoragePath = pup.paths.temporaryStorage
    // - A path to persistent storage that can be used by the plugin to store data across Pup restarts.
    const persistentStoragePath = pup.paths.persistentStorage //
    // - The full path to Pup's current configuration file (usually pup.json).
    const configFilePath = pup.paths.configFilePath
  }
}
```

## Custom logger plugin

To sum it up, and create a custom plugin that intercepts the logger through hooks, you need to extend the `PluginImplementation` class and override the `hook` method to handle the `log` signal. In
this example, the plugin will print all available log data when the log signal is received.

```typescript
import { LogEvent, PluginApi, PluginConfiguration, PluginImplementation } from "jsr:@pup/pup@$VERSION/mod.ts"

export class PupPlugin extends PluginImplementation {
  constructor(pup: PluginApi, config: PluginConfiguration) {
    super(pup, config)
    this.meta = {
      name: "LoggerInterceptorPlugin",
      version: "1.0.0",
      api: "1",
      repository: "https://github.com/hexagon/pup",
    }
  }

  public hook(signal: string, parameters: unknown): boolean {
    if (signal === "log") {
      this.handleLog(parameters as LogEvent)
      // Block further processing by other log plugins, or built in logger
      return true
    }
    return false
  }

  private handleLog(p: LogEvent) {
    console.log(p.severity, p.category, p.text)
  }
}
```

## End user configuration

The end user configuration for activating a plugin by `pup.json` is

```json
{
  /* ... */
  "processes": [/* ... */],
  "plugins": [
    /* Remote plugin */
    {
      "url": "jsr:@scope/pup-example-plugin@0.0.1/mod.ts",
      "options": {
        /* Plugin specific configuration */
      }
    },
    /* Local plugin */
    {
      "url": "./plugins/app-plugin.ts",
      "options": {
        /* Plugin specific configuration */
      }
    }
  ]
}
```
