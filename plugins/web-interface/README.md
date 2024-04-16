# pup web interface plugin

## Development Documentation for Contributors

This is the development guide for contributors looking to help improve the pup web interface plugin. In order to ensure that your changes work correctly and in harmony with the existing codebase,
please follow the steps outlined below.

## Prerequisites

- Have [Deno](https://deno.com/) installed on your machine.

- Basic knowledge of how [Bundlee](https://github.com/hexagon/bundlee) works: Bundlee is a minimalistic bundler for JavaScript and TypeScript. It takes multiple JS/TS files, compiles them (if needed),
  and bundles them into a single JS file for use in a browser or Deno.

- Understanding of how [Oak](https://oakserver.github.io/oak/) works: Oak is a middleware framework for Deno's http server. It is somewhat similar to Express in Node.js and allows you to build
  efficient web applications and APIs.

## Development Workflow

The pup web interface plugin uses [Bundlee](https://github.com/hexagon/bundlee) for bundling static assets, which includes files like 'static/web-interface.html', 'static/js/main.ts', and others. If
you make any changes to these files, you will need to generate a new bundle and restart the pup instance.

Follow these steps to test your changes:

1. **Generate a new bundle**

From the root directory of the pup project, execute the following command to build a new bundle.

`deno task build-webinterface`

2. **Start an instance that uses the web-interface plugin**

Start the basic web interface example:

`deno run -A --unstable pup.ts run --cwd docs/examples/basic-webinterface`

3. **Test the changes**

Browse to [http://localhost:5000](http://localhost:5000) to test your changes.

## Contribution guidelines

Contributions to Pup are very welcome! Please read [the contributing section](https://hexagon.github.io/pup/contributing.html) of the manual, fork the repository, make your changes, and submit a pull
request.
