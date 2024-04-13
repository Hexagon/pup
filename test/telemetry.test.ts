// deno-lint-ignore-file
import { assertEquals } from "@std/assert"
import { PupTelemetry } from "../telemetry.ts"
import { test } from "@cross/test"

test("PupTelemetry - Singleton pattern", () => {
  const telemetry1 = new PupTelemetry()
  const telemetry2 = new PupTelemetry()
  const telemetry3 = new PupTelemetry()

  assertEquals(telemetry1, telemetry2)
  assertEquals(telemetry1, telemetry3)

  telemetry1.close()
  telemetry2.close()
  telemetry3.close()
})

// deno-lint-ignore require-await
test("PupTelemetry - Emitting messages", async () => {
  const telemetry = new PupTelemetry()
  const eventData = { test: "data" }

  // Mock FileIPC
  class MockFileIPC {
    // deno-lint-ignore require-await
    async sendData(message: string) {
      const parsedMessage = JSON.parse(message)
      assertEquals(parsedMessage.testEvent, eventData)
    }
  }

  const originalFileIPC = (telemetry as any).FileIPC // deno-lint-ignore no-explicit-any
  ;(telemetry as any).FileIPC = MockFileIPC

  telemetry.emit("main", "testEvent", eventData) // deno-lint-ignore no-explicit-any
  ;(telemetry as any).FileIPC = originalFileIPC

  telemetry.close()
})
