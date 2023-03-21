import { PluginImplementation } from "../../../lib/core/plugin.ts"

export class PupPlugin extends PluginImplementation {
  public meta = {
    name: "Test Plugin",
    version: "1.0.0",
    api: "0",
    repository: "https://github.com/example/test-plugin",
  }
}
