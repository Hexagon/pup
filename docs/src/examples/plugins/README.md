---
title: "Plugin development"
parent: Contributing
nav_order: 2
---

# Plugin development

---

### Getting started

To create a custom plugin, developers should extend the `PluginImplementation` class from `@pup/plugin` and override its methods as necessary. This class is the main entry point for plugins.

The plugin then communicates with Pup using `PupRestClient` from `@pup/api-client`. The url and credentials are passed to the plugin constructor.

Example (full example available at <https://github.com/Hexagon/pup/tree/main/docs/src/examples/plugins>):

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
    // - api url and a token is supplied by Pup
    this.client = new PupRestClient(
      `http://${apiUrl}`,
      apiToken,
      true,
    )
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
// Listen for log messages from the API
this.client.on("application_state", (pupState: unknown) => {
  const tPupState = pupState as ApiApplicationState
})
```

## Rest Endpoints

The Rest client exposes methods for managing processes.

To use the Rest endponts, access it through client instance:

```ts
try {
  await this.client.sendLog(
    severity,
    "example-plugin",
    message,
  )
} catch (_e) { /* Could not send log */ }
```

Always wrap requests in try/catch, we do not want any unhandled errors in a Plugin.

### All endpoints

1. **`/processes`:**
   - **Purpose:** List configured processes and their statues.

2. **Process action Endpoints (`/processes/:id/start`, etc.):**
   - **Purpose:** Provide an interface for managing Pup processes.
   - **Actions:**
     - Retrieve process status (`/processes`) and application state (`/state`).
     - Start, stop, restart, block, and unblock processes (`/processes/:id/...`).

3. **`/terminate`:**
   - **Purpose:** Initiates a graceful termination of the Pup application.

4. **`/log`:**
   - **Purpose:** Allows sending log messages to Pup.
   - **Behavior:**
     - Extracts severity, plugin, and message from the request body.
     - Validates severity.
     - Logs the message.

5. **`/logs`:**
   - **Purpose:** Retrieves log entries from Pup.
   - **Parameters:**
     - `processId` (optional)
     - `startTimeStamp` (optional)
     - `endTimeStamp` (optional)
     - `severity` (optional)
     - `nRows` (optional)
   - **Behavior:**
     - Parses query parameters.
     - Calls the `PupApi.getLogs` method to fetch logs based on provided criteria.

## End user configuration

The end user configuration for activating a plugin by `pup.json` is

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

Full example available at <https://github.com/Hexagon/pup/tree/main/docs/src/examples/plugins>.
