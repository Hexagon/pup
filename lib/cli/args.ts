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
      "no-config": "n",
      /* ... cmd, cwd, id without alias */
    },
    boolean: ["v", "h", "s", "i", "u", "a", "r", "n"],
    string: ["c", "o", "cmd", "cwd", "id", "cron", "watch"],
    stopEarly: true,
    unknown: (_arg: string, key?: string, value?: unknown) => {
      return key === undefined && value === undefined
    },
  })
}

export { parseArguments }
