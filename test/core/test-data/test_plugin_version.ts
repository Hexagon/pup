import { PluginImplementation } from "../../../lib/core/plugin.ts"

export class PupPlugin extends PluginImplementation {
  public meta = {
    name: "Test Plugin",
    version: "unset",
    api: "1",
    repository: "https://github.com/example/test-plugin",
  }
}
