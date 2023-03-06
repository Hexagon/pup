import { pup } from "./lib/pup.ts"

try {
    const rawFile = await Deno.readTextFile("./pup.json")
    await pup(JSON.parse(rawFile))
} catch (_e) { 
    console.error("Could not start, no configuration found.");
}
