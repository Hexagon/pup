# pup web interface plugin

## Development documentation for contributors

Static assets (static/web-interface.html, static/js/main.ts, ...) are all bundled using [bundlee](https://github.com/hexagon/bundlee). So when any of these are changed, a new bundle has to be
generated, and the pup instance has to be restarted.

The development flow is currently

1. **Generate a new bundle**

From the pup root directory

`deno task build-webinterface`

2. **Start an instance that uses the web-interface plugin**

Like the basic-webinterface example:

`deno run -A --unstable pup.ts run --cwd docs/examples/basic-webinterface`

3. **Test the changes**

Browse to [http://localhost:5000](http://localhost:5000)
