import { dirExists, fileExists } from "../../lib/common/utils.ts"
import { assertEquals } from "@std/assert"

Deno.test("dirExists - Directory exists", async () => {
  const tempDir = await Deno.makeTempDir()

  const exists = await dirExists(tempDir)
  assertEquals(exists, true)

  await Deno.remove(tempDir)
})

Deno.test("dirExists - Directory does not exist", async () => {
  const tempDir = await Deno.makeTempDir()
  await Deno.remove(tempDir)

  const exists = await dirExists(tempDir)
  assertEquals(exists, false)
})

Deno.test("dirExists - Non-NotFound error occurs", async () => {
  const invalidDir = "\0"

  let errorOccurred = false
  try {
    await dirExists(invalidDir)
  } catch (_e) {
    errorOccurred = true
  }
  assertEquals(errorOccurred, true)
})

Deno.test("dirExists - Path exists but is not a directory", async () => {
  const tempFile = await Deno.makeTempFile()

  const exists = await dirExists(tempFile)
  assertEquals(exists, false)

  await Deno.remove(tempFile)
})

Deno.test("fileExists - File exists", async () => {
  const tempFile = await Deno.makeTempFile()

  const exists = await fileExists(tempFile)
  assertEquals(exists, true)

  await Deno.remove(tempFile)
})

Deno.test("fileExists - File does not exist", async () => {
  const tempFile = await Deno.makeTempFile()
  await Deno.remove(tempFile)

  const exists = await fileExists(tempFile)
  assertEquals(exists, false)
})

Deno.test("fileExists - Non-NotFound error occurs", async () => {
  const invalidFile = "\0"

  let errorOccurred = false
  try {
    await fileExists(invalidFile)
  } catch (_e) {
    errorOccurred = true
  }
  assertEquals(errorOccurred, true)
})

Deno.test("fileExists - Path exists but is not a file", async () => {
  const tempDir = await Deno.makeTempDir()

  const exists = await fileExists(tempDir)
  assertEquals(exists, false)

  await Deno.remove(tempDir)
})
