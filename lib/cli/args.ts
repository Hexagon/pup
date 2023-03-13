import { Args, parse } from "../../deps.ts"

function parseArguments(args: string[]): Args {
  return parse(args, {
    alias: {
      "version": "v",
      "help": "h",
      "config": "c",
      "status": "s",
      "init": "i",
      "append": "a",
      "autostart": "u",
      "remove": "r",
      "watch": "w",
      /* ... cmd, cwd, id without alias */
    },
    boolean: ["v", "h", "s", "i", "u", "w","a", "r"],
    string: ["c", "o", "cmd", "cwd", "id","cron"],
    stopEarly: true,
    unknown: (_arg: string, key?: string, value?: unknown) => {
      return key === undefined && value === undefined
    },
  })
}

export { parseArguments }
