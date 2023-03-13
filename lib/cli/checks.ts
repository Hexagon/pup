import { Application } from "../../pup.ts"
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
  console.log(" -i\t--init\t\t\tCreate a new pup.json")
  console.log(" -i\t--append\t\t\tAppend to existing configuraton file")
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
  let exit = false

  if (args.version) {
    exit = true
    if (!args.quiet) {
      printHeader()
    }
  }

  if (args.help) {
    exit = true
    printUsage()
    console.log("")
    printFlags()
  }

  // Do not allow configuration creation options without --init and vice versa
  if (args.autostart && !args.init && !args.append) {
    printUsage()
    console.log("")
    console.error("Argument '--autostart' requires '--init' or '--append'")
  }
  if (args.cron && !args.init && !args.append) {
    printUsage()
    console.log("")
    console.error("Argument '--cron' requires '--init' or '--append'")
  }
  if (args.watch && !args.init && !args.append) {
    printUsage()
    console.log("")
    console.error("Argument '--watch' requires '--init' or '--append'")
    Deno.exit(1)
  }
  if (args.cmd && !args.init && !args.append) {
    printUsage()
    console.log("")
    console.error("Argument '--cmd' requires '--init' or '--append'")
    Deno.exit(1)
  }
  if (args.watch && !args.init && !args.append) {
    printUsage()
    console.log("")
    console.error("Argument '--watch' requires '--init' or '--append'")
    Deno.exit(1)
  }
  if (!args.cmd && (args.init || args.append)) {
    printUsage()
    console.log("")
    console.error("Argument '--init' and '--append' requires '--cmd'")
    Deno.exit(1)
  }
  if (!args.id && (args.init || args.append || args.remove)) {
    printUsage()
    console.log("")
    console.error("Arguments '--init','--append' and '--remove' requires '--id'")
    Deno.exit(1)
  }
  if (!args.cmd && (args.init || args.append)) {
    printUsage()
    console.log("")
    console.error("Argument '--init' and '--append' requires '--cmd'")
    Deno.exit(1)
  }
  if (!args.id && (args.remove)) {
    printUsage()
    console.log("")
    console.error("Argument '--remove' requires '--id'")
    Deno.exit(1)
  }


  if (exit) {
    return null
  } else {
    if (!args._) {
      console.error("Missing argument")
    }

    return args
  }
}

export { checkArguments, printFlags, printHeader, printUsage }
