/**
 * Provides a mechanism for loading or generating properties stored in files,
 * ensuring secure file permissions.
 *
 * @file lib/common/prop.ts
 * @license MIT
 */

import { exists, readFile, writeFile } from "@cross/fs"
import { DEFAULT_PROP_FILE_PERMISSIONS } from "../core/configuration.ts"

export type PropGenerator = () => Promise<string>

export class Prop {
  /**
   * The file path where the property is stored.
   */
  path: string

  /**
   * An in-memory cache of the loaded or generated property.
   */
  cache: string | undefined

  /**
   * File permissions to use when creating the property file.
   */
  filePermissions: number

  /**
   * Creates a new instance of the Prop class.
   *
   * @param secretFilePath - The path to the file where the property is stored.
   * @param filePermissions - File permissions to use when creating the property file (default: 0o600).
   */
  constructor(secretFilePath: string, filePermissions = DEFAULT_PROP_FILE_PERMISSIONS) {
    this.path = secretFilePath
    this.filePermissions = filePermissions
  }

  /**
   * Generates a new property and stores it in the file.
   *
   * @throws On error
   * @returns The newly generated property.
   */
  async generate(generatorFn: PropGenerator): Promise<string> {
    const resultString = await generatorFn()
    await writeFile(this.path, resultString, { mode: this.filePermissions })
    return resultString
  }

  /**
   * Loads the property from the file system.
   *
   * @returns The property from the file.
   * @throws If an error occurs while reading the file.
   */
  async load(): Promise<string> {
    this.cache = await readFile(this.path, "utf-8")
    return this.cache!
  }

  /**
   * Loads the property from the cache
   *
   * @returns The property from the file.
   * @throws If an error occurs while reading the file.
   */
  fromCache(): string | undefined {
    return this.cache
  }

  /**
   * Loads the property if it exists in the file, or generates a new one if it doesn't.
   * The property is cached for subsequent calls. This is the primary method for using the class.
   *
   * @throws On any error
   * @returns The loaded or generated property.
   */
  async loadOrGenerate(generatorFn: PropGenerator): Promise<string> {
    if (!this.cache) {
      if (await exists(this.path)) {
        this.cache = await this.load()
      } else {
        this.cache = await this.generate(generatorFn)
      }
    }
    return this.cache
  }
}
