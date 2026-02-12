import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("defines handleCellSelect as a useCallback", () => {
  assert.match(
    source,
    /const handleCellSelect = useCallback\(\(cellId: string \| null\) => \{/,
  )
})

test("handleCellSelect calls setSelectedCellId with cellId", () => {
  const callbackMatch = source.match(
    /const handleCellSelect = useCallback\(\(cellId: string \| null\) => \{([\s\S]*?)\}, \[\]\)/,
  )
  assert.ok(callbackMatch, "handleCellSelect callback should exist")
  const body = callbackMatch[1]
  assert.match(body, /setSelectedCellId\(cellId\)/)
})

test("handleCellSelect has an empty dependency array", () => {
  assert.match(
    source,
    /const handleCellSelect = useCallback\([\s\S]*?\}, \[\]\)/,
  )
})

test("handleCellSelect clears virtual cell state", () => {
  const callbackMatch = source.match(
    /const handleCellSelect = useCallback\(\(cellId: string \| null\) => \{([\s\S]*?)\}, \[\]\)/,
  )
  assert.ok(callbackMatch, "handleCellSelect callback should exist")
  const body = callbackMatch[1]
  assert.match(
    body,
    /setSelectedVirtualCell\(null\)/,
    "handleCellSelect should clear virtual cell state with setSelectedVirtualCell(null)",
  )
})

test("MapContent uses handleCellSelect instead of setSelectedCellId", () => {
  assert.match(source, /onCellSelect=\{.*handleCellSelect/)
  assert.doesNotMatch(
    source,
    /onCellSelect=\{.*setSelectedCellId/,
    "onCellSelect should use handleCellSelect, not setSelectedCellId directly",
  )
})
