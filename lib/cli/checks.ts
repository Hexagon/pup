import { Application } from "../../application.meta.ts"
import { Args } from "../../deps.ts"

function printHeader() {
  console.log(Application.name + " " + Application.version)
  console.log(Application.repository)
}

function printUsage() {
  console.log(`Usage: ${Application.name} [OPTIONS...]`)
}

function printFlags() {
  console.log(' -c\t--config "path"\t\tUse specific configuration file. Default: pup.jsonc')
  console.log("")
  console.log(" -s\t--status\t\tDisplay status for a running instance")
  console.log("")
  console.log(" -n\t--no-config\t\t\tDo not use a configuration file")
  console.log(" -i\t--init\t\t\tCreate a new pup.json")
  console.log(" -a\t--append\t\t\tAppend to existing configuraton file")
  console.log('   \t--id "name"\t\tname of the task')
  console.log('   \t--cmd "command"\t\tCommand to run')
  console.log('   \t--cwd "command"\t\tWorking directory of the process')
  console.log(" -a\t--autostart\t\tAutostart process")
  console.log(" -r\t--cron\t\t\tStart using a cron pattern")
  console.log(' -w\t--watch "path"\t\tRestart on file change')
  console.log("")
  console.log(" -h\t--help\t\t\tDisplay this help and exit")
  console.log(" -v\t--version\t\tOutput version information and exit")
  console.log("")
}

function checkArguments(args: Args): Args | null {
  if (args.version) {
    if (!args.quiet) {
      printHeader()
    }
    return null
  }

  if (args.help) {
    printUsage()
    console.log("")
    printFlags()
    return null
  }

  // Do not allow configuration creation options without --init and vice versa
  if (args.autostart && !args.init && !args.append && !args["no-config"]) {
    throw new Error("Argument '--autostart' requires '--init', '--append' or '--no-config'")
  }
  if (args.cron && !args.init && !args.append && !args["no-config"]) {
    throw new Error("Argument '--cron' requires '--init', '--append' or '--no-config'")
  }
  if (args.watch && !args.init && !args.append && !args["no-config"]) {
    throw new Error("Argument '--watch' requires '--init', '--append' or '--no-config'")
  }
  if (args.cmd && !args.init && !args.append && !args["no-config"]) {
    throw new Error("Argument '--cmd' requires '--init', '--append' or '--no-config'")
  }
  if (!args.cmd && (args.init || args.append || args["no-config"])) {
    throw new Error("Argument '--init', '--append' and '--no-config' requires '--cmd'")
  }
  if (!args.id && (args.init || args.append || args.remove)) {
    throw new Error("Arguments '--init','--append' and '--remove' requires '--id'")
  }
  if (args["no-config"] && !args.cmd) {
    throw new Error("Argument '--no-config' requires '--cmd")
  }

  return args
}

export { checkArguments, printFlags, printHeader, printUsage }
