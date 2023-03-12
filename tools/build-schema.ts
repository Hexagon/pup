import { zodToJsonSchema } from "npm:zod-to-json-schema" // Can not get it to work. Issue: https://github.com/StefanTerdell/zod-to-json-schema/issues/47
import { ConfigurationSchema } from "../lib/core/configuration.ts"

const configurationSchema = ConfigurationSchema.describe("Pup configuration file")

const jsonSchema = zodToJsonSchema(configurationSchema, "ConfigurationSchema")

console.log(jsonSchema)
