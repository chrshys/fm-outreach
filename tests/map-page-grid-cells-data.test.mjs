import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// gridCellsData query and destructuring
// ============================================================

test("queries listCells into gridCellsData variable", () => {
  assert.match(
    source,
    /const\s+gridCellsData\s*=\s*useQuery\(\s*api\.discovery\.gridCells\.listCells/,
  )
})

test("uses globalGridId (not selectedGridId) in listCells query condition", () => {
  assert.match(
    source,
    /globalGridId\s*\?\s*\{\s*gridId:\s*globalGridId\s*\}\s*:\s*"skip"/,
  )
})

test("derives cells from gridCellsData", () => {
  assert.match(
    source,
    /const\s+cells\s*=\s*gridCellsData\?\.cells/,
  )
})

test("derives activatedBoundsKeys from gridCellsData with empty array default", () => {
  assert.match(
    source,
    /const\s+activatedBoundsKeys\s*=\s*gridCellsData\?\.activatedBoundsKeys\s*\?\?\s*\[\]/,
  )
})

test("does not use gridCellsResult variable name", () => {
  assert.doesNotMatch(
    source,
    /const\s+gridCellsResult\b/,
  )
})

test("passes derived cells to MapContent gridCells prop", () => {
  assert.match(
    source,
    /gridCells=\{viewMode\s*===\s*"discovery"\s*\?\s*cells\s*\?\?\s*undefined\s*:\s*undefined\}/,
  )
})

test("passes derived cells to DiscoveryPanel cells prop", () => {
  assert.match(
    source,
    /cells=\{cells\s*\?\?\s*\[\]\}/,
  )
})

test("handleCellAction uses cells (not gridCells) to find cell", () => {
  assert.match(
    source,
    /const\s+cell\s*=\s*cells\?\.find/,
  )
})

test("handleCellAction depends on cells in useCallback deps", () => {
  // Find the handleCellAction callback and check its deps
  const match = source.match(
    /const handleCellAction = useCallback\(async[\s\S]*?\},\s*\[([^\]]*)\]\)/,
  )
  assert.ok(match, "handleCellAction callback should exist")
  assert.match(match[1], /\bcells\b/, "deps should include cells")
  assert.doesNotMatch(match[1], /\bgridCells\b/, "deps should not include gridCells")
})
