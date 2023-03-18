async function fileExists(filePath: string) {
  try {
    const statResult = await Deno.stat(filePath)
    if (statResult.isFile) {
      return true
    } else {
      return false
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return false
    } else {
      throw e
    }
  }
}

export { fileExists }
