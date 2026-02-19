import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")
const discoverCellSource = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8")
const discoveryGridSource = fs.readFileSync("src/components/map/discovery-grid-shared.ts", "utf8")

// ============================================================
// Backend: discoverCell sets lastSearchedAt timestamp
// ============================================================

test("discoverCell passes lastSearchedAt: now to updateCellSearchResult", () => {
  assert.match(discoverCellSource, /const now = Date\.now\(\)/)
  assert.match(discoverCellSource, /lastSearchedAt:\s*now/)
})

// ============================================================
// Backend: updateCellSearchResult stores lastSearchedAt
// ============================================================

test("updateCellSearchResult accepts lastSearchedAt as v.number()", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("export const updateCellSearchResult"),
  )
  assert.match(block, /lastSearchedAt:\s*v\.number\(\)/)
})

test("updateCellSearchResult patches cell with lastSearchedAt", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("export const updateCellSearchResult"),
  )
  assert.match(block, /lastSearchedAt:\s*args\.lastSearchedAt/)
})

// ============================================================
// Backend: listCells returns lastSearchedAt to frontend
// ============================================================

test("listCells includes lastSearchedAt in response mapping", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("export const listCells"),
    gridCellsSource.indexOf("export const claimCellForSearch"),
  )
  assert.match(block, /lastSearchedAt:\s*cell\.lastSearchedAt/)
})

// ============================================================
// Frontend: CellData type includes lastSearchedAt
// ============================================================

test("CellData type includes lastSearchedAt as optional number", () => {
  assert.match(discoveryGridSource, /lastSearchedAt\?:\s*number/)
})

// ============================================================
// Frontend: formatRelativeTime helper exists
// ============================================================

test("formatRelativeTime returns relative time strings", () => {
  assert.match(discoveryGridSource, /function\s+formatRelativeTime\(timestamp:\s*number\)/)
  assert.match(discoveryGridSource, /return\s*"today"/)
  assert.match(discoveryGridSource, /return\s*"yesterday"/)
  assert.match(discoveryGridSource, /days ago/)
  assert.match(discoveryGridSource, /weeks ago/)
  assert.match(discoveryGridSource, /months ago/)
})
