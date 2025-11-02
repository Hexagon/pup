# Agents Guide

This document provides an overview of the Pup repository structure, tools, and development workflow for AI agents and contributors.

## Repository Structure

```
pup/
├── lib/                    # Core library code
│   ├── cli/               # Command-line interface
│   ├── common/            # Common utilities
│   ├── core/              # Core process management logic
│   ├── test/              # Test utilities
│   ├── types/             # TypeScript type definitions
│   └── workers/           # Worker scripts
├── test/                  # Test files
│   ├── cli/              # CLI tests
│   └── core/             # Core functionality tests
├── docs/                  # Documentation (Lume-based site)
│   └── src/
│       ├── examples/      # Usage examples
│       ├── usage/         # Usage guides
│       └── contributing/  # Contribution guides
├── tools/                 # Build and development tools
├── pup.ts                 # Main entry point
├── mod.ts                 # Library export
└── deno.json              # Deno configuration and tasks
```

## Development Tools

Pup is built with Deno. Key commands are defined in `deno.json`:

### Formatting and Linting
```bash
deno fmt                   # Format code
deno fmt --check          # Check formatting
deno lint                 # Lint code
```

### Testing
```bash
deno test --allow-read --allow-write --allow-env --allow-net --allow-sys --allow-run --coverage=cov_profile
```

### Build Tasks
```bash
deno task check           # Run format, lint, and tests
deno task build-schema    # Generate JSON schema
deno task build-versions  # Update version information
deno task build           # Complete build process
```

## Pre-commit Checks

The project uses GitHub Actions for CI (`.github/workflows/deno.yaml`):
- Format checking (`deno fmt --check`)
- Linting (`deno lint`)
- Full test suite with coverage
- Runs on: `main` and `dev` branches

Before submitting PRs, run `deno task check` locally to ensure all checks pass.

## Related Projects

Pup is part of an ecosystem of packages available on JSR:

### Core Dependencies
- **[@pup/api-definitions](https://github.com/hexagon/pup-api-definitions)** - API type definitions shared across the ecosystem
- **[@pup/api-client](https://github.com/hexagon/pup-api-client)** - REST API client for CLI, plugins, and telemetry
- **[@pup/telemetry](https://github.com/hexagon/pup-telemetry)** - Runtime-agnostic library for process telemetry and IPC
- **[@pup/common](https://github.com/hexagon/pup-common)** - Common utilities shared across Pup packages
- **[@pup/plugin](https://github.com/hexagon/pup-plugin)** - Base library for creating Pup plugins

### Official Plugins
- **[pup-plugin-web-interface](https://github.com/hexagon/pup-plugin-web-interface)** - Web-based UI for managing Pup

## Key Concepts

- **Process Management**: Core functionality in `lib/core/`
- **Configuration**: Uses `pup.json` files (see `docs/src/examples/`)
- **Service Management**: Cross-platform service installation (sysvinit, systemd, upstart, macOS, Windows)
- **Telemetry & IPC**: Process monitoring and inter-process communication
- **Plugins**: Extensible architecture for adding functionality

## Making Changes

1. Fork and create a branch from `dev`
2. Make minimal, focused changes
3. Add/update tests in `test/` directory
4. Run `deno task check` to validate
5. Update documentation if needed
6. Submit PR against `dev` branch

## Documentation

Full documentation is available at [pup.56k.guru](https://pup.56k.guru), built from `docs/src/` using Lume.
