import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// getAvailableActions uses depth > 0 for undivide (not parentCellId)
// ============================================================

test("getAvailableActions includes undivide for depth > 0 cells without parentCellId", () => {
  const fnBlock = source.slice(
    source.indexOf("export function getAvailableActions"),
    source.indexOf("function formatShortDate"),
  )
  assert.match(fnBlock, /cell\.depth\s*>\s*0/)
  assert.doesNotMatch(fnBlock, /cell\.parentCellId/)
})

// ============================================================
// Tooltip/CellTooltipContent are removed (merge button UI moved to panel)
// ============================================================

test("no CellTooltipContent component exists", () => {
  assert.doesNotMatch(source, /function\s+CellTooltipContent/)
})
