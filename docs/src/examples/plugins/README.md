---
title: "Plugin development"
parent: Contributing
nav_order: 2
---

# Plugin development

---

### Getting started

To create a custom plugin, developers should extend the `PluginImplementation` class from `@pup/plugin`, overriding its methods as necessary. This class serves as the main entry point for plugins.

The plugin then communicates with Pup using `PupRestClient` from `@pup/api-client`. The URL and credentials are passed to the plugin constructor.

### Examples

A full example available at <https://github.com/Hexagon/pup/tree/main/docs/src/examples/plugins>, the official web interface plugin available at <https://github.com/hexagon/pup-plugin-web-interface>
could also be used as a reference implementation.

A minimal example which injects logs indicating if current memory usage is ok or high:

```typescript
import { PupRestClient } from "jsr:@pup/api-client"
import { type PluginConfiguration, PluginImplementation } from "jsr:@pup/plugin"

// Set up the expected configuration
interface Configuration {
  threshold: string
}

// The main entrypoint of a Plugin is an exported class named PupPlugin
// which should always extend PluginImplementation
export class PupPlugin extends PluginImplementation {
  public meta = {
    name: "ExamplePlugin",
    version: "1.0.0",
    api: "1.0.0",
    repository: "https://github.com/user/my-repo",
  }

  private config: Configuration
  private client: PupRestClient

  constructor(
    config: PluginConfiguration,
    apiUrl: string,
    apiToken: string,
  ) {
    super(config, apiUrl, apiToken)

    this.config = config.options as Configuration

    // Set up the rest client
    // - API URL and token are supplied by Pup
    this.client = new PupRestClient(
      `http://${apiUrl}`,
      apiToken,
      true,
    )
  }

  // Forward api token refreshes to the api client
  public async refreshApiToken(apiToken: string): Promise<void> {
    this.client.refreshApiToken(apiToken)
  }
}
```

Now, to communicate with pup, there are two concepts

## Events

Events allow plugins to listen for specific occurrences within Pup. Plugins can subscribe to events using the `.on` method of the Rest client

The following events are available:

- **log:** Fired when a log event occurs.
- **init:** Fired when Pup initializes.
- **watchdog:** Fired when the watchdog timer triggers.
- **process_status_changed:** Fired when a process's status changes.
- **process_scheduled:** Fired when a process is scheduled to run.
- **process_watch:** Fired when a process's watch configuration triggers a restart.
- **terminating:** Fired when Pup is terminating.
- **ipc:** Fired when an IPC message is received.

```ts
// Listen for process status changes
this.client.on("process_status_changed", (eventData) => {
  // ... and take custom actions
  if (eventData.processId === "my-important-process" && eventData.newState === "failed") {
    // Send an alert or attempt to restart the process
  }
})
```

## Rest Endpoints

The Rest client exposes methods for managing processes.

To use the REST endpoints, access them through the client instance:

```ts
try {
  await this.client.sendLog(
    severity,
    "example-plugin",
    message,
  )
} catch (_e) { /* Could not send log */ }
```

Always wrap requests in try/catch blocks; we do not want any unhandled errors in a plugin.

### All endpoints

1. **`/processes`:** List configured processes and their statues.

2. **(`/processes/<id>/<action>>`):** Controls processes. `<action>` is one of `start`, `stop`, `restart`, `block` or `unblock`. `<id>` could be `all` or a configured process id.

3. **`/terminate`:** Initiate a graceful termination of the Pup application, when Pup is running as a system service, this effectively restarts Pup.

4. **`/log`:** Inject logs into Pup

- Extracts `severity`, `plugin`, and `message` from the request body.
- Validates severity.
- Logs the message.

5. **`/logs`:** Retrieves log entries from Pup.
   - **Parameters:**
     - `processId` (optional)
     - `startTimeStamp` (optional)
     - `endTimeStamp` (optional)
     - `severity` (optional)
     - `nRows` (optional)

## End user configuration

The end user configuration for activating a plugin through `pup.json` is:

```json
{
  /* ... */
  "processes": [/* ... */],
  "plugins": [
    /* Remote plugin */
    {
      "url": "jsr:@scope/pup-example-plugin",
      "options": {
        /* Plugin specific configuration */
      }
    },
    /* Local plugin */
    {
      "url": "file:///full/path/to/plugin/plugin.ts",
      "options": {
        /* Plugin specific configuration */
      }
    }
  ]
}
```

The official plugins are published on jsr.io, but Pup will work just as well with plugins from other sources, including local imports, provided that an absolute URL including `file://` is used.

Full example available at <https://github.com/Hexagon/pup/tree/main/docs/src/examples/plugins>.
