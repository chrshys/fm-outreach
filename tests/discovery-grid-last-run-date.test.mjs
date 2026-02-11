import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")
const discoverCellSource = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8")
const discoveryGridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")

// ============================================================
// Backend: discoverCell sets lastSearchedAt timestamp
// ============================================================

test("discoverCell passes lastSearchedAt: now to updateCellSearchResult", () => {
  // The action captures Date.now() and includes it in the update call
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
// Frontend: formatShortDate helper
// ============================================================

test("formatShortDate formats timestamp using en-US month short and day numeric", () => {
  assert.match(discoveryGridSource, /function\s+formatShortDate\(timestamp:\s*number\)/)
  assert.match(discoveryGridSource, /toLocaleDateString\("en-US"/)
  assert.match(discoveryGridSource, /month:\s*"short"/)
  assert.match(discoveryGridSource, /day:\s*"numeric"/)
})

// ============================================================
// Frontend: Google Places row renders lastSearchedAt date
// ============================================================

test("Google Places row checks mechanism.id === google_places and cell.lastSearchedAt", () => {
  assert.match(
    discoveryGridSource,
    /mechanism\.id\s*===\s*"google_places"\s*&&\s*cell\.lastSearchedAt/,
  )
})

test("Google Places row calls formatShortDate with cell.lastSearchedAt", () => {
  assert.match(discoveryGridSource, /formatShortDate\(cell\.lastSearchedAt\)/)
})

test("last-run date is rendered in a span with muted-foreground styling", () => {
  // The date value is shown in a muted span next to the run button
  assert.match(discoveryGridSource, /className="text-muted-foreground">\{lastRun\}/)
})

test("non-google_places mechanisms show dash for last-run date", () => {
  assert.match(discoveryGridSource, /:\s*"—"/)
})
