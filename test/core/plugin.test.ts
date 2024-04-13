import { assertEquals, assertThrows } from "@std/assert"
import { Pup } from "../../lib/core/pup.ts"
import { Plugin, PluginApi } from "../../lib/core/plugin.ts"
import { PluginConfiguration } from "../../lib/core/configuration.ts"
import { test } from "@cross/test"

const minimalPupConfiguration = {
  processes: [],
}

test("Plugin - Load and verify missing meta.name", async () => {
  const pup = await Pup.init(minimalPupConfiguration)
  const pluginConfiguration: PluginConfiguration = {
    url: "../../test/core/test-data/test_plugin_name.ts",
  }
  const plugin = new Plugin(pup, pluginConfiguration)

  await plugin.load()
  assertThrows(() => plugin.verify(), Error, "Plugin missing meta.name")
})

test("Plugin - Load and verify missing meta.repository", async () => {
  const pup = await Pup.init(minimalPupConfiguration)
  const pluginConfiguration: PluginConfiguration = {
    url: "../../test/core/test-data/test_plugin_repository.ts",
  }
  const plugin = new Plugin(pup, pluginConfiguration)

  await plugin.load()
  assertThrows(() => plugin.verify(), Error, "Plugin missing meta.repository")
})

test("Plugin - Load and verify missing meta.version", async () => {
  const pup = await Pup.init(minimalPupConfiguration)
  const pluginConfiguration: PluginConfiguration = {
    url: "../../test/core/test-data/test_plugin_version.ts",
  }
  const plugin = new Plugin(pup, pluginConfiguration)

  await plugin.load()
  assertThrows(() => plugin.verify(), Error, "Plugin missing meta.version")
})

test("Plugin - Load and verify missing meta.api", async () => {
  const pup = await Pup.init(minimalPupConfiguration)
  const pluginConfiguration: PluginConfiguration = {
    url: "../../test/core/test-data/test_plugin_api.ts",
  }
  const plugin = new Plugin(pup, pluginConfiguration)

  await plugin.load()
  assertThrows(() => plugin.verify(), Error, "Plugin missing meta.api")
})

test("Plugin - Load and verify unsupported API version", async () => {
  const pup = await Pup.init(minimalPupConfiguration)
  const pluginConfiguration: PluginConfiguration = {
    url: "../../test/core/test-data/test_plugin_unsupported_api.ts",
  }
  const plugin = new Plugin(pup, pluginConfiguration)

  await plugin.load()
  assertThrows(() => plugin.verify(), Error, "Plugin version not supported")
})

test("Plugin - Test default hook implementation", async () => {
  const pup = await Pup.init(minimalPupConfiguration)
  const pluginConfiguration: PluginConfiguration = {
    url: "../../test/core/test-data/test_plugin_valid.ts",
  }
  const plugin = new Plugin(pup, pluginConfiguration)

  await plugin.load()
  plugin.verify()
  const result = plugin.impl?.hook("testSignal", {})
  assertEquals(result, false, "Default hook implementation should return false")
})

test("PluginApi - Check temporaryStorage path - undefined", async () => {
  const pup = await Pup.init(minimalPupConfiguration)
  const pluginApi = new PluginApi(pup)

  assertEquals(
    pluginApi.paths.temporaryStorage,
    pup.temporaryStoragePath,
    "Temporary storage path should match Pup's temporaryStoragePath",
  )

  assertEquals(
    pluginApi.paths.temporaryStorage,
    undefined,
    "Temporary storage path should be undefined",
  )
})

test("PluginApi - Check persistentStorage path - undefined", async () => {
  const pup = await Pup.init(minimalPupConfiguration)
  const pluginApi = new PluginApi(pup)
  assertEquals(
    pluginApi.paths.persistentStorage,
    pup.temporaryStoragePath,
    "Persistent storage path should match Pup's temporaryStoragePath",
  )

  assertEquals(
    pluginApi.paths.persistentStorage,
    undefined,
    "Persistent storage path should be undefined",
  )
})

test("PluginApi - Check configFilePath - undefined", async () => {
  const pup = await Pup.init(minimalPupConfiguration)
  const pluginApi = new PluginApi(pup)

  assertEquals(
    pluginApi.paths.configFilePath,
    pup.configFilePath,
    "Config file path should match Pup's configFilePath",
  )

  assertEquals(
    pluginApi.paths.configFilePath,
    undefined,
    "Config file path should be undefined",
  )
})

test("PluginApi - Check configFilePath - set", async () => {
  const pup = await Pup.init(minimalPupConfiguration, "./test/core/test-data/test.json")
  const pluginApi = new PluginApi(pup)

  assertEquals(
    pluginApi.paths.configFilePath,
    pup.configFilePath,
    "Config file path should match Pup's configFilePath",
  )

  assertEquals(
    pluginApi.paths.configFilePath?.includes("test/core/test-data/test.json") || pluginApi.paths.configFilePath?.includes("test\\core\\test-data\\test.json"),
    true,
    "Config file path should include the actual path",
  )
})

test("PluginApi - Check temporaryStorage path - set", async () => {
  const pup = await Pup.init(minimalPupConfiguration, "./test/core/test-data/test.json")
  const pluginApi = new PluginApi(pup)

  assertEquals(
    pluginApi.paths.temporaryStorage,
    pup.temporaryStoragePath,
    "Temporary storage path should match Pup's temporaryStoragePath",
  )
  assertEquals(
    pup.temporaryStoragePath?.includes("test/core/test-data/.pup/test.json-tmp") || pup.temporaryStoragePath?.includes("test\\core\\test-data\\.pup\\test.json-tmp"),
    true,
  )
})

test("PluginApi - Check persistentStorage path - set", async () => {
  const pup = await Pup.init(minimalPupConfiguration, "./test/core/test-data/test.json")
  const pluginApi = new PluginApi(pup)

  assertEquals(
    pluginApi.paths.persistentStorage,
    pup.persistentStoragePath,
    "Persistent storage path should match Pup's persistentStoragePath",
  )
  assertEquals(
    pup.persistentStoragePath?.includes("test/core/test-data/.pup/test.json-data") || pup.persistentStoragePath?.includes("test\\core\\test-data\\.pup\\test.json-data"),
    true,
  )
})

test("Plugin - Test signal listener", async () => {
  const pup = await Pup.init(minimalPupConfiguration)
  const pluginConfiguration: PluginConfiguration = {
    url: "../../test/core/test-data/test_signal_listener.ts",
  }
  const plugin = new Plugin(pup, pluginConfiguration)

  await plugin.load()
  plugin.verify()

  // Emit the test signal
  pup.events.emit("testSignal")

  // Check if the plugin has received the signal
  // deno-lint-ignore no-explicit-any
  const hasReceivedSignal = (plugin.impl as any).hasReceivedSignal("testSignal")
  assertEquals(hasReceivedSignal, true, "Test plugin should have received the 'testSignal'")
})
