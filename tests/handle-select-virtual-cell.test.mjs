import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// handleSelectVirtualCell callback behaviour
// ============================================================

test("handleSelectVirtualCell is defined with useCallback", () => {
  assert.match(
    pageSource,
    /const handleSelectVirtualCell\s*=\s*useCallback\(/,
  )
})

test("handleSelectVirtualCell accepts (cell: VirtualCell | null)", () => {
  assert.match(
    pageSource,
    /handleSelectVirtualCell\s*=\s*useCallback\(\(cell:\s*VirtualCell\s*\|\s*null\)/,
  )
})

test("handleSelectVirtualCell sets selectedVirtualCell to the cell argument", () => {
  const fnMatch = pageSource.match(
    /handleSelectVirtualCell\s*=\s*useCallback\([\s\S]*?\),\s*\[/,
  )
  assert.ok(fnMatch, "handleSelectVirtualCell not found")
  assert.match(fnMatch[0], /setSelectedVirtualCell\(cell\)/)
})

test("handleSelectVirtualCell sets selectedCellId to cell.key when cell is non-null", () => {
  const fnMatch = pageSource.match(
    /handleSelectVirtualCell\s*=\s*useCallback\([\s\S]*?\),\s*\[/,
  )
  assert.ok(fnMatch, "handleSelectVirtualCell not found")
  assert.match(fnMatch[0], /setSelectedCellId\(cell\s*\?\s*cell\.key\s*:\s*null\)/)
})

test("handleSelectVirtualCell sets selectedCellId to null when cell is null (deselect)", () => {
  // Same ternary: cell ? cell.key : null — when cell is null, result is null
  const fnMatch = pageSource.match(
    /handleSelectVirtualCell\s*=\s*useCallback\([\s\S]*?\),\s*\[/,
  )
  assert.ok(fnMatch, "handleSelectVirtualCell not found")
  assert.match(fnMatch[0], /cell\s*\?\s*cell\.key\s*:\s*null/)
})

test("handleSelectVirtualCell has empty dependency array (stable reference)", () => {
  assert.match(
    pageSource,
    /handleSelectVirtualCell\s*=\s*useCallback\([\s\S]*},\s*\[\]\)/,
  )
})

test("onSelectVirtualCell prop passes handleSelectVirtualCell in discovery mode", () => {
  assert.match(
    pageSource,
    /onSelectVirtualCell=\{viewMode\s*===\s*"discovery"\s*\?\s*handleSelectVirtualCell\s*:\s*undefined\}/,
  )
})
