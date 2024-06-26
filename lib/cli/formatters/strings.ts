/**
 * Exports string formatter functions for use in the CLI status table
 *
 * @file      lib/cli/formatters/string.ts
 * @license   MIT
 */

import { Colors } from "@cross/utils"

export const statusFormatter = (s: string) => {
  if (s.trim() === "RUNNING") {
    return Colors.green(s)
  } else if (s.trim() === "ERRORED") {
    return Colors.red(s)
  } else {
    return s
  }
}
export const naFormatter = (s: string) => {
  if (s.trim() === "N/A") {
    return Colors.dim(s)
  } else {
    return s
  }
}
export const codeFormatter = (s: string) => {
  if (s.trim() === "N/A") {
    return Colors.dim(s)
  } else if (s.trim() === "0") {
    return Colors.green(s)
  } else {
    return Colors.red(s)
  }
}
export const blockedFormatter = (s: string) => {
  if (s.trim() === "No") {
    return Colors.green(s)
  } else {
    return naFormatter(s)
  }
}
export const restartsFormatter = (s: string): string => {
  if (s.trim() === "N/A") {
    return s
  } else if (s.trim() === "0") {
    return Colors.green(s)
  } else {
    return Colors.yellow(s)
  }
}
