import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)

// ============================================================
// getAvailableActions uses depth > 0 for undivide (not parentCellId)
// ============================================================

test("getAvailableActions includes undivide for depth > 0 cells without parentCellId", () => {
  const fnBlock = gridSource.slice(
    gridSource.indexOf("export function getAvailableActions"),
    gridSource.indexOf("function formatShortDate"),
  )
  assert.match(fnBlock, /cell\.depth\s*>\s*0/)
  assert.doesNotMatch(fnBlock, /cell\.parentCellId/)
})

// ============================================================
// Merge button in discovery panel uses depth > 0 (not parentCellId)
// ============================================================

test("panel merge button is gated on depth > 0", () => {
  assert.match(panelSource, /selectedCell\.depth\s*>\s*0/)
})

test("panel merge button does not use parentCellId", () => {
  // Extract the selected-cell section (from "Selected Cell" label to end of that block)
  const selectedCellStart = panelSource.indexOf("{/* Selected Cell */}")
  assert.ok(selectedCellStart !== -1, "Selected Cell section should exist in panel")
  const selectedCellBlock = panelSource.slice(selectedCellStart, selectedCellStart + 2000)
  assert.doesNotMatch(selectedCellBlock, /parentCellId/)
})
