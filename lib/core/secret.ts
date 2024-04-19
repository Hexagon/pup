import { exists, readFile, writeFile } from "@cross/fs"
import { encodeBase64 } from "@std/encoding/base64"

export class Secret {
  path: string // Type annotation for clarity
  cache: string | undefined // Cached secret

  constructor(secretFilePath: string) { // Type annotation for the parameter
    this.path = secretFilePath
  }

  async generateSecret(): Promise<string> {
    const secretArray = new Uint8Array(32)
    crypto.getRandomValues(secretArray)
    const secret = encodeBase64(secretArray)
    await writeFile(this.path, secret)
    return secret
  }

  async loadSecret(): Promise<string> { // Specify return type
    return await readFile(this.path, "utf-8")
  }

  async get(): Promise<string> { // Specify return type
    try {
      if (!this.cache) {
        if (await exists(this.path)) {
          this.cache = await this.loadSecret()
        } else {
          this.cache = await this.generateSecret()
        }
      }
      return this.cache
    } catch (err) {
      console.error("Error handling secret:", err)
      throw err
    }
  }
}
