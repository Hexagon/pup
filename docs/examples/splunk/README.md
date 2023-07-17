---
layout: page
title: "Server w/ Splunk Logging"
parent: Examples
nav_order: 6
---

# Server with Splunk Logging

---

The example at [/docs/examples/splunk](https://github.com/Hexagon/pup/tree/main/docs/examples/splunk) runs a Deno server script as a continuously monitored and restarted process, logging all output to
Splunk using the splunk-hec plugin.

> **Note:** If you're connecting to a Splunk HEC server with a bad certificate, such as during testing, you'll need to start pup manually with the `--unsafely-ignore-certificate-errors` flag. The full
> command for this would be `deno run -Ar --unsafely-ignore-certificate-errors https://deno.land/x/pup/pup.ts run`

## Files

- [pup.jsonc](https://github.com/Hexagon/pup/tree/main/docs/examples/splunk/pup.jsonc) - Pup configuration, sets up `server.js` to be kept alive forever and enables the Splunk HEC plugin for logging.
- [server.js](https://github.com/Hexagon/pup/tree/main/docs/examples/splunk/server.js) - Fake server, prints the value of env.TZ to demonstrate custom environment variables, runs for 10 seconds, then
  exits, to demonstrate restart behavior.

## Configuration

The HEC token can be configured in the `pup.jsonc` configuration file as shown in the example configuration, or by using the environment variable `PUP_SPLUNK_HEC_TOKEN`.

## Running

`cd` to `/docs/examples/splunk` directory.

Start the example by running `pup run` if pup is installed, or something like `deno run -A ../../../pup.ts run` if not.

Success!
