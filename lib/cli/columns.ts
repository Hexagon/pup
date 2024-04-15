/**
 * Exports helper functions to format an array of rows into a table with specified columns.
 * Belongs to Pup cli entrypoint
 *
 * @file      lib/cli/table.ts
 * @license   MIT
 */

import { Colors } from "@cross/utils"

/**
 * Represents a column of the table.
 * @interface
 */
export interface Column {
  key: string
  formatter?: (s: string) => string
  header?: string
  minWidth?: number
  maxWidth?: number
  align?: "left" | "center" | "right"
}

/**
 * Represents a normal row of the table.
 * @interface
 */
export interface Row {
  [key: string]: string | number | undefined
}

/**
 * Represents a special separator row of the table.
 * @interface
 */
export interface SeparatorRow {
  [key: string]: string | number | undefined
  separator: "dashed" | "dotted" | "equals" | "empty"
}

export function isSeparatorRow(row: TableRow): row is SeparatorRow {
  return "separator" in row
}

export interface SpanningRow {
  [key: string]: string | number | undefined
  content: string
  spanStart?: number
  spanEnd?: number
  align?: "left" | "center" | "right"
}

export type TableRow = Row | SeparatorRow | SpanningRow

export function isSpanningRow(row: TableRow): row is SpanningRow {
  return "content" in row
}

/**
 * Formats an array of rows into a table with specified columns.
 * @param {Row[]} rows - The array of rows to be formatted.
 * @param {Column[]} columns - The array of columns to be included in the table.
 * @returns {string} The formatted table string.
 */
export function Columns(rows: TableRow[], columns: Column[]): string {
  const columnSizes: Record<string, number> = {}

  // Determine column sizes
  columns.forEach((column) => {
    const headerLength = column.header?.length ?? 0
    const maxWidth = column.maxWidth ?? Infinity
    const minWidth = column.minWidth ?? 0
    const maxLength = Math.max(
      minWidth,
      ...rows.filter((row) => !isSeparatorRow(row)).map((row) => (((row[typeof column.key === "number" ? (column.key as number).toString(10) : column.key]) as string)?.length ?? 0)),
    )
    columnSizes[column.key] = Math.min(maxWidth, Math.max(headerLength, maxLength))
  })

  // Generate formatted rows
  const formattedRows: string[] = []
  rows.forEach((row) => {
    if (isSeparatorRow(row)) {
      const separatorSymbol = row.separator === "dotted" ? "." : row.separator === "equals" ? "=" : row.separator === "empty" ? "" : "-"
      formattedRows.push(columns.map((column) => separatorSymbol.repeat(columnSizes[column.key])).join(" "))
    } else if (isSpanningRow(row)) {
      const spanStart = row.spanStart ?? 0
      const spanEnd = row.spanEnd ?? columns.length
      const content = row.content

      const spanWidth = columns.slice(spanStart, spanEnd).reduce((total, column) => total + columnSizes[column.key], 0) + (spanEnd - spanStart - 1) * 1
      const align = row.align ?? "left"
      const padding = " ".repeat(spanWidth - content.length)

      let formattedSpanningRow = ""
      if (align === "left") {
        formattedSpanningRow = content + padding
      } else if (align === "right") {
        formattedSpanningRow = padding + content
      } else {
        const halfPadding = " ".repeat(Math.floor(padding.length / 2))
        formattedSpanningRow = halfPadding + content + halfPadding
      }

      const combined = " ".repeat(spanStart) + formattedSpanningRow
      formattedRows.push(combined)
    } else {
      const normalRow = row as Row
      formattedRows.push(
        columns
          .map((column) => {
            const value = String(normalRow[column.key]?.toString().substring(0, columnSizes[column.key]) ?? "")
            const align = column.align ?? "left"
            const padding = " ".repeat(columnSizes[column.key] - value.length)
            let combined: string
            if (align === "left") {
              combined = `${value}${padding}`
            } else if (align === "right") {
              combined = `${padding}${value}`
            } else {
              const halfPadding = " ".repeat(Math.floor(padding.length / 2))
              combined = `${halfPadding}${value}${halfPadding}`
            }
            return column.formatter ? column.formatter(combined) : combined
          })
          .join(" "),
      )
    }
  })

  // Generate header row with padding
  let headerRow
  if (columns.findIndex((column) => !column.header)) {
    headerRow = columns.map((column) => {
      const header = column.header?.substring(0, columnSizes[column.key]) ?? ""
      const padding = " ".repeat(columnSizes[column.key] - header.length)
      return `${Colors.bold(header)}${padding}`
    }).join(" ")
  }

  // Generate final output
  const output = (headerRow ? [headerRow] : []).concat(formattedRows).join("\n")
  return output
}
