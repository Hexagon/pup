import { Args, parse } from "../deps.ts"

function parseArguments(args: string[]): Args {
  return parse(args, {
    alias: {
      "version": "v",
      "help": "h",
      "config": "c",
    },
    boolean: ["v", "h"],
    string: ["c"],
    stopEarly: true,
    unknown: (_arg: string, key?: string, value?: unknown) => {
      return key === undefined && value === undefined
    },
  })
}

export { parseArguments }
