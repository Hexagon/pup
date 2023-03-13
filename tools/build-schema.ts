import { zodToJsonSchema } from "npm:zod-to-json-schema@3.20.4"
import { ConfigurationSchema } from "../lib/core/configuration.ts"
//import JSONSchemaToMarkdown from "npm:json-schema-to-markdown"

const configurationSchema = ConfigurationSchema.describe("Pup configuration file")
const jsonSchema = zodToJsonSchema(configurationSchema, "ConfigurationSchema")
const jsonSchemaString = JSON.stringify(jsonSchema, null, 2)
//const jsonSchemaMarkdownString = JSONSchemaToMarkdown(zodToJsonSchema(configurationSchema, "ConfigurationSchema"))

Deno.writeTextFileSync("./docs/pup.schema.json", jsonSchemaString)
//Deno.writeTextFileSync("./docs/CONFIGURATION.md", jsonSchemaMarkdownString);
