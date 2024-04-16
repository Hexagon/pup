/**
 * Exports time formatter functions for use in the CLI status table
 *
 * @file      lib/cli/formatters/string.ts
 * @license   MIT
 */

import { format, register } from "timeago.js"

const shortTimeagoLocale = (_number: number | undefined, index: number, _totalSec: number | undefined): [string, string] => {
  return [
    ["just now", "right now"],
    ["%s s ago", "in %s s"],
    ["1 min ago", "in 1 min"],
    ["%s mins ago", "in %s mins"],
    ["1 hour ago", "in 1 hour"],
    ["%s hrs ago", "in %s hrs"],
    ["1 day ago", "in 1 day"],
    ["%s days ago", "in %s days"],
    ["1 wk ago", "in 1 wk"],
    ["%s wks ago", "in %s wks"],
    ["1 mth ago", "in 1 mth"],
    ["%s mths ago", "in %s mths"],
    ["1 yr ago", "in 1 yr"],
    ["%s yrs ago", "in %s yrs"],
  ][index] as [string, string]
}

register("short_timeago", shortTimeagoLocale)

export const timeagoFormatter = (s: string | Date) => {
  if (typeof s === "string" && s.trim() === "N/A") {
    return s
  } else {
    return format(s, "short_timeago")
  }
}
