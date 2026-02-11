import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")
const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")

// ============================================================
// 1. Backend: listGrids computes accurate stats
// ============================================================

test("listGrids computes searchingCount from cells with status searching", () => {
  const listGridsBlock = gridCellsSource.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  )
  assert.ok(listGridsBlock)
  const body = listGridsBlock[1]

  assert.match(body, /searchingCount/)
  assert.match(body, /status\s*===\s*"searching"/)
})

test("listGrids returns searchingCount in result", () => {
  const listGridsBlock = gridCellsSource.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  )
  assert.ok(listGridsBlock)
  const body = listGridsBlock[1]

  // Verify searchingCount appears in the return object
  const returnBlock = body.match(/return\s*\{([\s\S]*?)\}/)
  assert.ok(returnBlock, "return block not found")
  assert.match(returnBlock[1], /searchingCount/)
})

test("listGrids counts all three statuses: searched, saturated, searching", () => {
  const listGridsBlock = gridCellsSource.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  )
  assert.ok(listGridsBlock)
  const body = listGridsBlock[1]

  assert.match(body, /status\s*===\s*"searched"/)
  assert.match(body, /status\s*===\s*"saturated"/)
  assert.match(body, /status\s*===\s*"searching"/)
})

// ============================================================
// 2. Frontend: GridWithStats type includes searchingCount
// ============================================================

test("GridWithStats type includes searchingCount field", () => {
  assert.match(panelSource, /searchingCount:\s*number/)
})

// ============================================================
// 3. Frontend: Searched count includes saturated cells
// ============================================================

test("searched display combines searchedCount + saturatedCount for total searched", () => {
  // The displayed "Searched" value should add searchedCount + saturatedCount
  assert.match(
    panelSource,
    /searchedCount\s*\+\s*selectedGrid\.saturatedCount/,
    "Searched display should sum searchedCount and saturatedCount",
  )
})

test("searched display shows combined count out of totalLeafCells", () => {
  // Pattern: {searchedCount + saturatedCount} / {totalLeafCells}
  assert.match(
    panelSource,
    /searchedCount\s*\+\s*selectedGrid\.saturatedCount[\s\S]*?totalLeafCells/,
  )
})

// ============================================================
// 4. Frontend: Searching indicator shown when cells in progress
// ============================================================

test("shows searching count when cells are actively being searched", () => {
  assert.match(panelSource, /searchingCount\s*>\s*0/)
  assert.match(panelSource, /Searching/)
})

test("searching indicator uses blue color", () => {
  assert.match(panelSource, /text-blue-500/)
})

// ============================================================
// 5. Frontend: Leads count still displayed from totalLeadsFound
// ============================================================

test("leads found displays totalLeadsFound from grid", () => {
  assert.match(panelSource, /selectedGrid\.totalLeadsFound/)
  assert.match(panelSource, /Leads Found/)
})

// ============================================================
// 6. Progress bar uses correct calculation
// ============================================================

test("progress bar width uses (searchedCount + saturatedCount) / totalLeafCells", () => {
  assert.match(
    panelSource,
    /searchedCount\s*\+\s*selectedGrid\.saturatedCount.*\/\s*selectedGrid\.totalLeafCells.*\*\s*100/,
  )
})
