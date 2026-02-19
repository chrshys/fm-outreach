import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// =============================================================================
// Validate: With no cell selected, grid progress shows total leads and
// directory-readiness percentage.
//
// The panel uses a ternary: when selectedCell is present and not "unsearched",
// it shows Cell Progress; otherwise it falls through to Grid Progress. The
// Grid Progress branch must contain Total Leads and Directory Ready with %.
// =============================================================================

// Extract the ternary condition that selects Cell Progress vs Grid Progress.
// Cell Progress is guarded by: selectedCell && selectedCell.status !== "unsearched"
// Grid Progress is in the else branch (no cell selected, or cell is unsearched).

test("Grid Progress renders when no cell is selected (else branch of selectedCell ternary)", () => {
  // The ternary condition: selectedCell && selectedCell.status !== "unsearched"
  assert.match(
    source,
    /selectedCell\s*&&\s*selectedCell\.status\s*!==\s*"unsearched"\s*\?/,
    "should gate Cell Progress on selectedCell && status !== 'unsearched'",
  )
})

test("Cell Progress is in the truthy branch, Grid Progress in the falsy branch", () => {
  const ternaryIdx = source.search(/selectedCell\s*&&\s*selectedCell\.status\s*!==\s*"unsearched"\s*\?/)
  assert.ok(ternaryIdx > -1, "ternary guard not found")

  const afterTernary = source.slice(ternaryIdx)
  const cellProgressIdx = afterTernary.indexOf("Cell Progress")
  const gridProgressIdx = afterTernary.indexOf("Grid Progress")

  assert.ok(cellProgressIdx > -1, "Cell Progress label not found after ternary")
  assert.ok(gridProgressIdx > -1, "Grid Progress label not found after ternary")
  assert.ok(
    cellProgressIdx < gridProgressIdx,
    "Cell Progress should come before Grid Progress (truthy branch first, then else)",
  )
})

// Extract Grid Progress block to verify its contents
const gridProgressIdx = source.indexOf("Grid Progress")
const gridProgressEnd = source.indexOf("{/* Selected Cell */}", gridProgressIdx)
const gridProgressBlock = source.slice(gridProgressIdx, gridProgressEnd)

test("Grid Progress block contains 'Total Leads' label", () => {
  assert.match(gridProgressBlock, /Total Leads/)
})

test("Grid Progress block contains 'Directory Ready' label", () => {
  assert.match(gridProgressBlock, /Directory Ready/)
})

test("Grid Progress shows directory-readiness as a percentage", () => {
  const dirReadyIdx = gridProgressBlock.indexOf("Directory Ready")
  const afterDirReady = gridProgressBlock.slice(dirReadyIdx, dirReadyIdx + 500)
  // Percentage calculation: Math.round((directoryReady / totalLeads) * 100)
  assert.match(afterDirReady, /%/, "should display a percentage symbol after directory ready count")
  assert.match(afterDirReady, /Math\.round/, "should use Math.round for the percentage")
})

test("Grid Progress total leads uses gridEnrichmentStats with selectedGrid fallback", () => {
  assert.match(
    gridProgressBlock,
    /gridEnrichmentStats\?\.totalLeads\s*\?\?\s*selectedGrid\.totalLeadsFound/,
  )
})
