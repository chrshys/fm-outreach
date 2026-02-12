import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// =============================================================================
// 1. Contextual label: "Cell Progress" vs "Grid Progress"
// =============================================================================

test("progress section shows 'Cell Progress' label when cell is selected and searched", () => {
  assert.match(source, /Cell Progress/)
})

test("progress section shows 'Grid Progress' label for grid-level stats", () => {
  assert.match(source, /Grid Progress/)
})

test("cell progress branch conditioned on selectedCell existing and not unsearched", () => {
  assert.match(
    source,
    /selectedCell\s*&&\s*selectedCell\.status\s*!==\s*"unsearched"/,
  )
})

// =============================================================================
// 2. Cell-level stats display
// =============================================================================

test("cell progress shows cell status badge with getStatusBadgeColor", () => {
  // Within the Cell Progress branch, status is shown via getStatusBadgeColor
  const cellProgressIdx = source.indexOf("Cell Progress")
  assert.ok(cellProgressIdx > -1)
  const afterCellProgress = source.slice(cellProgressIdx, cellProgressIdx + 500)
  assert.match(afterCellProgress, /getStatusBadgeColor\(selectedCell\.status\)/)
})

test("cell progress shows cell status text", () => {
  const cellProgressIdx = source.indexOf("Cell Progress")
  const afterCellProgress = source.slice(cellProgressIdx, cellProgressIdx + 500)
  assert.match(afterCellProgress, /\{selectedCell\.status\}/)
})

test("cell progress shows result count when available", () => {
  const cellProgressIdx = source.indexOf("Cell Progress")
  const gridProgressIdx = source.indexOf("Grid Progress")
  const cellProgressBlock = source.slice(cellProgressIdx, gridProgressIdx)
  assert.match(cellProgressBlock, /selectedCell\.resultCount/)
  assert.match(cellProgressBlock, /Results/)
})

test("cell progress shows leads found from selectedCell", () => {
  const cellProgressIdx = source.indexOf("Cell Progress")
  const gridProgressIdx = source.indexOf("Grid Progress")
  const cellProgressBlock = source.slice(cellProgressIdx, gridProgressIdx)
  assert.match(cellProgressBlock, /selectedCell\.leadsFound/)
  assert.match(cellProgressBlock, /Leads Found/)
})

test("cell progress leads found defaults to 0 via nullish coalescing", () => {
  assert.match(source, /selectedCell\.leadsFound\s*\?\?\s*0/)
})

test("cell progress leads found uses green text", () => {
  const cellProgressIdx = source.indexOf("Cell Progress")
  const gridProgressIdx = source.indexOf("Grid Progress")
  const cellProgressBlock = source.slice(cellProgressIdx, gridProgressIdx)
  assert.match(cellProgressBlock, /text-green-500/)
})

// =============================================================================
// 3. Grid-level stats still present in the else branch
// =============================================================================

test("grid progress branch still shows searched count with totalLeafCells", () => {
  const gridProgressIdx = source.indexOf("Grid Progress")
  const selectedCellIdx = source.indexOf("{/* Selected Cell */}")
  assert.ok(gridProgressIdx > -1)
  const gridProgressBlock = source.slice(gridProgressIdx, selectedCellIdx)
  assert.match(gridProgressBlock, /selectedGrid\.searchedCount\s*\+\s*selectedGrid\.saturatedCount/)
  assert.match(gridProgressBlock, /selectedGrid\.totalLeafCells/)
})

test("grid progress branch still shows saturated count with orange text", () => {
  const gridProgressIdx = source.indexOf("Grid Progress")
  const selectedCellIdx = source.indexOf("{/* Selected Cell */}")
  const gridProgressBlock = source.slice(gridProgressIdx, selectedCellIdx)
  assert.match(gridProgressBlock, /text-orange-500/)
  assert.match(gridProgressBlock, /selectedGrid\.saturatedCount/)
})

test("grid progress branch still shows totalLeadsFound with green text", () => {
  const gridProgressIdx = source.indexOf("Grid Progress")
  const selectedCellIdx = source.indexOf("{/* Selected Cell */}")
  const gridProgressBlock = source.slice(gridProgressIdx, selectedCellIdx)
  assert.match(gridProgressBlock, /text-green-500/)
  assert.match(gridProgressBlock, /selectedGrid\.totalLeadsFound/)
})

test("grid progress branch still shows progress bar", () => {
  const gridProgressIdx = source.indexOf("Grid Progress")
  const selectedCellIdx = source.indexOf("{/* Selected Cell */}")
  const gridProgressBlock = source.slice(gridProgressIdx, selectedCellIdx)
  assert.match(gridProgressBlock, /bg-green-500\s+transition-all/)
})

// =============================================================================
// 4. Conditional structure: ternary between cell and grid progress
// =============================================================================

test("Cell Progress appears before Grid Progress in source", () => {
  const cellIdx = source.indexOf("Cell Progress")
  const gridIdx = source.indexOf("Grid Progress")
  assert.ok(cellIdx > -1, "Cell Progress exists")
  assert.ok(gridIdx > -1, "Grid Progress exists")
  assert.ok(cellIdx < gridIdx, "Cell Progress appears before Grid Progress (ternary true branch first)")
})
