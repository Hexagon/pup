# Max Restarts and Exponential Backoff Example

This example demonstrates how to configure restart limits and exponential backoff for processes that may fail.

## Overview

The configuration shows two processes:

1. **max-3-times**: Uses a fixed restart delay of 3 seconds and allows up to 3 restarts
2. **with-exponential-backoff**: Uses exponential backoff starting at 1 second and capping at 30 seconds, allowing up to 5 restarts

## How Exponential Backoff Works

When a process fails repeatedly, exponential backoff prevents rapid restart loops by increasing the delay between each restart attempt:

- **1st restart**: 1 second delay (restartDelayMs)
- **2nd restart**: 2 seconds delay (1s × 2¹)
- **3rd restart**: 4 seconds delay (1s × 2²)
- **4th restart**: 8 seconds delay (1s × 2³)
- **5th restart**: 16 seconds delay (1s × 2⁴)
- **Further restarts**: 30 seconds delay (capped at restartBackoffMs)

This approach:

- Gives transient issues time to resolve
- Prevents resource exhaustion from rapid restart loops
- Allows more restart attempts while being system-friendly

## Running the Example

```bash
pup run
```

The `server.js` script exits immediately, so both processes will restart according to their configured policies until they reach their restart limits.

## Configuration

```jsonc
{
  "processes": [
    {
      "id": "max-3-times",
      "cmd": "deno run server.js",
      "autostart": true,
      "restart": "always",
      "restartLimit": 3,
      "restartDelayMs": 3000
    },
    {
      "id": "with-exponential-backoff",
      "cmd": "deno run server.js",
      "autostart": true,
      "restart": "always",
      "restartLimit": 5,
      "restartDelayMs": 1000,
      "restartBackoffMs": 30000
    }
  ]
}
```

## When to Use Exponential Backoff

Exponential backoff is particularly useful for:

- Services that may experience temporary network issues
- Processes that depend on external resources (databases, APIs)
- Applications that might fail during deployment or updates
- Any process where rapid restart loops could cause problems

## Notes

- If `restartBackoffMs` is not set, the process will use a fixed `restartDelayMs` between all restarts
- The backoff resets when the process exits successfully (status: FINISHED) or is manually stopped
- Combined with `restartLimit`, exponential backoff provides robust process recovery while preventing runaway restart loops
