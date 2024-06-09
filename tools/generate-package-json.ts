import { $ } from "jsr:@david/dax"

import { Application } from "../application.meta.ts"

import config from "../deno.json" with { type: "json" }

// Remove existing package.json
try {
  Deno.remove("./package.json")
} catch (_e) {
  console.warn("Existing package.json could not be removed.")
}

// Construct package.json Data
const packageJson = {
  type: "module",
  name: `@hexagon/${Application.name}`,
  version: Application.version,
  description: Application.description,
  module: "./mod.ts",
  bin: "./pup.ts",
  files: [
    "lib/*",
    "application.meta.ts",
    "mod.ts",
    "pup.ts",
    "versions.json",
  ],
}

// Write initial package.json File
await Deno.writeTextFile("./package.json", JSON.stringify(packageJson, null, 2))
console.log("package.json created successfully!")

// 4. Install Dependencies Using jsr and npm
const npmDepdencies = []
const jsrDepdencies = []
for (const dependency in config.imports) {
  if ((config.imports as Record<string, string>)[dependency].startsWith("npm:")) {
    npmDepdencies.push(dependency)
    console.log(`Found npm dependency: ${dependency}`)
  } else {
    jsrDepdencies.push(dependency)
    console.log(`Found jsr dependency: ${dependency}`)
  }
}
if (npmDepdencies.length) {
  await $.raw`npm i ${npmDepdencies.join(" ")}`
}
if (jsrDepdencies.length) {
  await $.raw`npx jsr add ${jsrDepdencies.join(" ")}`
}

// Read updated package.json
const updatedPackageJson = JSON.parse(await Deno.readTextFile("./package.json"))

// Add all jsr deps as bundledDependencies
updatedPackageJson.bundledDependencies = jsrDepdencies

// Write updated package.json
await Deno.writeTextFile("./package.json", JSON.stringify(updatedPackageJson, null, 2))
console.log("package.json created successfully!")
