import { type PluginApi, PluginImplementation } from "../../../lib/core/plugin.ts"

export class PupPlugin extends PluginImplementation {
  public meta = {
    name: "Test Signal Listener",
    version: "1.0.0",
    api: "1",
    repository: "https://github.com/example/test-signal-listener",
  }

  private receivedSignals: string[] = []

  // deno-lint-ignore no-explicit-any
  constructor(pup: PluginApi, _config: any) {
    super(pup, _config)
    pup.events.on("testSignal", () => {
      this.receivedSignals.push("testSignal")
    })
  }

  public hasReceivedSignal(signal: string): boolean {
    return this.receivedSignals.includes(signal)
  }
}
