import { zodToJsonSchema } from "npm:zod-to-json-schema@3.20.4"
import { ConfigurationSchema } from "../lib/core/configuration.ts"

const configurationSchema = ConfigurationSchema.describe("Pup configuration file")
const jsonSchema = zodToJsonSchema(configurationSchema, "ConfigurationSchema")
const jsonSchemaString = JSON.stringify(jsonSchema, null, 2)

Deno.writeTextFileSync("./docs/pup.schema.json", jsonSchemaString)
