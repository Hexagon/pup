/**
 * Exports application metadata as `{ Application }`
 *
 * The `Application` object provides metadata about the Pup application.
 *
 * Properties:
 *
 * - `name`: The name of the application (e.g., "pup").
 * - `version`: The current version of the application (e.g., "1.0.0-beta.33").
 * - `url`: The URL to access the released Pup source code for the specified version. $VERSION will be replaced by the value of the `version` property when used.
 * - `canary_url`: The URL to access the latest version of Pup in the `main` branch of the GitHub repository, used for the `canary` release channel.
 * - `deno`: Minimum stable version of Deno required to run Pup (without --unstable flag). Set to `null` if the current version cannot be run without `--unstable`.
 * - `deno_unstable`: Minimum version of Deno required to run Pup (with --unstable flag). This allows the user to run Pup with experimental features or using an older version of Deno.
 * - `repository`: The URL of the GitHub repository for Pup.
 * - `changelog`: The URL to the changelog for Pup.
 *
 * Current version information is automatically archived in `versions.json` at each build.
 *
 * @file      application.meta.ts
 */

const Application = {
  name: "pup",
  version: "1.0.4",
  url: "jsr:@pup/pup@$VERSION",
  description: "Powerful universal process manager, designed to keep your scripts, applications and services alive.",
  canary_url: "https://raw.githubusercontent.com/Hexagon/pup/refs/heads/dev/pup.ts",
  deno: "1.44.0", /* Minimum stable version of Deno required to run Pup (without --unstable-* flags)  */
  deno_unstable: "1.44.0", /* Minimum version of Deno required to run Pup (with --unstable-* flags) */
  repository: "https://github.com/hexagon/pup",
  changelog: "https://hexagon.github.io/pup/changelog.html",
  permissions: [
    "--allow-env",
    "--allow-read",
    "--allow-write",
    "--allow-sys=loadavg,systemMemoryInfo,osUptime,osRelease,uid,gid",
    "--allow-net",
    "--allow-run",
    "--allow-ffi",
  ],
}

export { Application }
