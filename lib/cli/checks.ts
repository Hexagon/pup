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
  console.log(" -c\t--config\tUse specific configuration file")
  console.log("")
  console.log(" -h\t--help\t\tDisplay this help and exit")
  console.log(" -v\t--version\tOutput version information and exit")
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
    if (!args.quiet) {
      printUsage()
      console.log("")
      printFlags()
    }
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
