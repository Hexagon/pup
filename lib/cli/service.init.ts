import { existsSync } from "../../deps.ts"
import { InstallServiceOptions } from "./service.ts"

const initScriptTemplate = `#!/bin/sh
### BEGIN INIT INFO
# Provides:          {{name}}
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: {{name}} (Pup Service)
# Description:       Start {{name}} service
### END INIT INFO

PATH={{path}}

# Change the next line to match your Pup installation
PUP_COMMAND="{{pupCommand}}"

case "$1" in
  start)
    echo "Starting {{name}}..."
    $PUP_COMMAND &
    echo $! > /var/run/{{name}}.pid
    ;;
  stop)
    echo "Stopping {{name}}..."
    PID=$(cat /var/run/{{name}}.pid)
    kill $PID
    rm /var/run/{{name}}.pid
    ;;
  restart)
    $0 stop
    $0 start
    ;;
  status)
    if [ -e /var/run/{{name}}.pid ]; then
      echo "{{name}} is running"
    else
      echo "{{name}} is not running"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac

exit 0
`

async function installServiceInit(options: InstallServiceOptions, onlyGenerate: boolean) {
  const { name = "pup", config } = options

  const initScriptPath = `/etc/init.d/${name}`

  if (existsSync(initScriptPath)) {
    console.error(`Service '${name}' already exists in '${initScriptPath}'. Exiting.`)
    Deno.exit(1)
  }

  const denoPath = Deno.execPath()
  const pupCommand = `pup run ${config ? `--config ${config}` : ""}`
  const pupPath = `PATH=$PATH:${denoPath}:${Deno.env.get("HOME")}/.deno/bin`

  let initScriptContent = initScriptTemplate.replace(/{{name}}/g, name)
  initScriptContent = initScriptContent.replace("{{pupCommand}}", pupCommand)
  initScriptContent = initScriptContent.replace("{{path}}", pupPath)

  if (onlyGenerate) {
    console.log("\nThis is a dry-run, nothing will be written to disk or installed.")
    console.log("\nPath: ", initScriptPath)
    console.log("\nConfiguration:\n")
    console.log(initScriptContent)
  } else {
    // Store temporary file
    const tempFilePath = await Deno.makeTempFile()
    await Deno.writeTextFile(tempFilePath, initScriptContent)

    console.log("\nPup do not have (and should not have) root permissions, so the next steps have to be carried out manually.")
    console.log(`\nStep 1: The init script has been saved to a temporary file, copy this file to the correct location using the following command:`)
    console.log(`\n  sudo cp ${tempFilePath} ${initScriptPath}`)
    console.log(`\nStep 2: Make the script executable:`)
    console.log(`\n  sudo chmod +x ${initScriptPath}`)
    console.log(`\nStep 3: Enable the service to start at boot:`)
    console.log(`\n  sudo update-rc.d ${name} defaults`)
    console.log(`\nStep 4: Start the service now`)
    console.log(`\n  sudo service ${name} start`)
  }
}

export { installServiceInit }
