import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// MAX_DEPTH constant is defined
// ============================================================

test("MAX_DEPTH is defined as 4", () => {
  assert.match(source, /const\s+MAX_DEPTH\s*=\s*4/)
})

// ============================================================
// getAvailableActions uses MAX_DEPTH for subdivide guard
// ============================================================

test("getAvailableActions guards subdivide with depth < MAX_DEPTH", () => {
  const fnBlock = source.slice(
    source.indexOf("export function getAvailableActions"),
    source.indexOf("function formatShortDate"),
  )
  assert.match(fnBlock, /cell\.depth\s*<\s*MAX_DEPTH/)
  assert.match(fnBlock, /\{\s*type:\s*"subdivide"\s*\}/)
})

// ============================================================
// Tooltip/CellTooltipContent are removed (split button UI moved to panel)
// ============================================================

test("no CellTooltipContent component exists", () => {
  assert.doesNotMatch(source, /function\s+CellTooltipContent/)
})
