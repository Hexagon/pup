import { exists, readFile, writeFile } from "@cross/fs"
import { encodeBase64 } from "@std/encoding/base64"
import { DEFAULT_SECRET_FILE_PERMISSIONS, DEFAULT_SECRET_LENGTH_BYTES } from "./configuration.ts"

export class Secret {
  /**
   * The file path where the secret is stored.
   */
  path: string

  /**
   * An in-memory cache of the loaded or generated secret.
   */
  cache: string | undefined

  /**
   * The desired length of the secret in bytes.
   */
  byteLength: number

  /**
   * File permissions to use when creating the secret file.
   */
  filePermissions: number

  /**
   * Creates a new instance of the Secret class.
   *
   * @param secretFilePath - The path to the file where the secret is stored.
   * @param secretLength - The desired length of the secret in bytes (default: 64).
   * @param filePermissions - File permissions to use when creating the secret file (default: 0o600).
   */
  constructor(secretFilePath: string, secretLength = DEFAULT_SECRET_LENGTH_BYTES, filePermissions = DEFAULT_SECRET_FILE_PERMISSIONS) {
    this.path = secretFilePath
    this.byteLength = secretLength
    this.filePermissions = filePermissions
  }

  /**
   * Generates a new random secret and stores it in the file.
   *
   * @throws On error
   * @returns The newly generated secret.
   */
  async generate(): Promise<string> {
    const secretArray = new Uint8Array(this.byteLength)
    crypto.getRandomValues(secretArray)
    const secret = encodeBase64(secretArray)
    await writeFile(this.path, secret, { mode: this.filePermissions })
    return secret
  }

  /**
   * Loads the secret from the file system.
   *
   * @returns The secret from the file.
   * @throws If an error occurs while reading the file.
   */
  async load(): Promise<string> {
    return await readFile(this.path, "utf-8")
  }

  /**
   * Loads the secret if it exists in the file, or generates a new one if it doesn't.
   * The secret is cached for subsequent calls. This is the primary method for using the class.
   *
   * @throws On any error
   * @returns The loaded or generated secret.
   */
  async loadOrGenerate(): Promise<string> {
    if (!this.cache) {
      if (await exists(this.path)) {
        this.cache = await this.load()
      } else {
        this.cache = await this.generate()
      }
    }
    return this.cache
  }
}
