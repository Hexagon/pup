import { existsSync } from "../../deps.ts"
import { InstallServiceOptions } from "./service.ts"

const upstartFileTemplate = `# {{name}} (Pup Service)

description "{{name}} Pup Service"
author "Pup user"

start on (filesystem and net-device-up IFACE!=lo)
stop on runlevel [!2345]

respawn
respawn limit 10 5

env PATH={{path}}

# Change the next line to match your Pup installation
env PUP_COMMAND="{{pupCommand}}"

exec $PUP_COMMAND
`

async function installServiceUpstart(options: InstallServiceOptions, onlyGenerate: boolean) {
  const { name = "pup", config } = options

  const upstartFilePath = `/etc/init/${name}.conf`

  if (existsSync(upstartFilePath)) {
    console.error(`Service '${name}' already exists in '${upstartFilePath}'. Exiting.`)
    Deno.exit(1)
  }

  const denoPath = Deno.execPath()
  const pupCommand = `pup run ${config ? `--config ${config}` : ""}`
  const pupPath = `PATH=$PATH:${denoPath}:${Deno.env.get("HOME")}/.deno/bin`

  let upstartFileContent = upstartFileTemplate.replace(/{{name}}/g, name)
  upstartFileContent = upstartFileContent.replace("{{pupCommand}}", pupCommand)
  upstartFileContent = upstartFileContent.replace("{{path}}", pupPath)

  if (onlyGenerate) {
    console.log("\nThis is a dry-run, nothing will be written to disk or installed.")
    console.log("\nPath: ", upstartFilePath)
    console.log("\nConfiguration:\n")
    console.log(upstartFileContent)
  } else {
    // Store temporary file
    const tempFilePath = await Deno.makeTempFile()
    await Deno.writeTextFile(tempFilePath, upstartFileContent)

    console.log("\nPup do not have (and should not have) root permissions, so the next steps have to be carried out manually.")
    console.log(`\nStep 1: The upstart configuration has been saved to a temporary file, copy this file to the correct location using the following command:`)
    console.log(`\n  sudo cp ${tempFilePath} ${upstartFilePath}`)
    console.log(`\nStep 2: Start the service now`)
    console.log(`\n  sudo start ${name}\n`)
  }
}

export { installServiceUpstart }
