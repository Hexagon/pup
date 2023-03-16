import { Args } from "../../deps.ts"

function checkArguments(args: Args): Args {
  const configOptions = args.init || args.append || args["no-config"]

  // Do not allow configuration creation options without --init and vice versa
  if (args.autostart && !configOptions) {
    throw new Error("Argument '--autostart' requires '--init', '--append' or '--no-config'")
  }
  if (args.cron && !configOptions) {
    throw new Error("Argument '--cron' requires '--init', '--append' or '--no-config'")
  }
  if (args.watch && !configOptions) {
    throw new Error("Argument '--watch' requires '--init', '--append' or '--no-config'")
  }
  if (args.cmd && !configOptions) {
    throw new Error("Argument '--cmd' requires '--init', '--append' or '--no-config'")
  }
  if (!args.cmd && configOptions) {
    throw new Error("Arguments '--init', '--append', and '--no-config' require '--cmd'")
  }
  if (!args.id && (args.init || args.append || args.remove)) {
    throw new Error("Arguments '--init','--append', and '--remove' require '--id'")
  }
  if (args["no-config"] && !args.cmd) {
    throw new Error("Argument '--no-config' requires '--cmd'")
  }

  return args
}

export { checkArguments }
