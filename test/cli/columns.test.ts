import { assertEquals } from "@std/assert"
import { type Column, Columns, type SeparatorRow, type TableRow } from "../../lib/cli/columns.ts"
import { test } from "@cross/test"
import { stripAnsi } from "@cross/utils"

test("Formats and pads Rows and Columns correctly", () => {
  const columns: Column[] = [
    { key: "name", header: "Name", align: "left" },
    { key: "age", header: "Age", align: "center" },
  ]

  const rows: TableRow[] = [
    { name: "John Doe", age: 30 },
    { name: "Jane Doe", age: 35 },
  ]

  const expectedOutput = `Name     Age\nJohn Doe 30\nJane Doe 35`

  const result = Columns(rows, columns)

  assertEquals(stripAnsi(result), expectedOutput)
})

test("Formats and pads SeparatorRow correctly", () => {
  const columns: Column[] = [
    { key: "name", header: "Name", align: "left" },
    { key: "age", header: "Age", align: "center" },
  ]

  const rows: TableRow[] = [
    { name: "John Doe", age: 30 },
    { separator: "equals" } as SeparatorRow,
    { name: "Jane Doe", age: 35 },
  ]

  const expectedOutput = `Name     Age\nJohn Doe 30\n======== ===\nJane Doe 35`

  const result = Columns(rows, columns)

  assertEquals(stripAnsi(result), expectedOutput)
})
