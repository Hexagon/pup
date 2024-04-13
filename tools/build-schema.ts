import { zodToJsonSchema } from "zod-to-json-schema"
import { ConfigurationSchema } from "../lib/core/configuration.ts"

const configurationSchema = ConfigurationSchema.describe("Pup configuration file")
const jsonSchema = zodToJsonSchema(configurationSchema, "ConfigurationSchema")
const jsonSchemaString = JSON.stringify(jsonSchema, null, 2)

Deno.writeTextFileSync("./docs/pup.schema.json", jsonSchemaString)
