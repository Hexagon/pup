import { assertEquals } from "../deps.ts"
import { generateConfiguration } from "../../lib/core/configuration.ts"

Deno.test("generateConfiguration: create a basic configuration", () => {
  const id = "task"
  const cmd = ["npm", "start"]
  const cwd = "/path/to/project"
  const cron = "* * * * *"
  const autostart = true
  const watch = ". test"

  const config = generateConfiguration(id, cmd, cwd, cron, autostart, watch)

  assertEquals(config, {
    processes: [{
      id,
      cmd: ["npm", "start"],
      cwd,
      cron,
      autostart,
      watch: [". test"],
    }],
  })
})
