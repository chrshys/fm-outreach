import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

const tooltipStart = source.indexOf("function CellTooltipContent")
const tooltipEnd = source.indexOf(
  "/** Delay in ms before the tooltip closes",
)
const tooltipBlock = source.slice(tooltipStart, tooltipEnd)

// ============================================================
// Split/Merge buttons are shown (not hidden) when cell is searching
// ============================================================

test("bottom row (Split/Merge) is NOT conditionally hidden by isSearching", () => {
  // The old pattern was {!isSearching && <div>...buttons...</div>}
  // Now buttons should always render, just disabled when searching
  assert.doesNotMatch(tooltipBlock, /\{!isSearching\s*&&\s*\(/)
})

test("Split/Merge buttons render unconditionally in tooltip", () => {
  // The border-t div containing Split and Merge should not be
  // wrapped in an isSearching conditional
  assert.match(tooltipBlock, /border-t pt-2/)
  assert.match(tooltipBlock, /Grid2x2Plus/)
  assert.match(tooltipBlock, /Minimize2/)
})

// ============================================================
// Split button is disabled when searching
// ============================================================

test("Split button disabled attribute includes isSearching", () => {
  assert.match(tooltipBlock, /disabled=\{cell\.depth\s*>=\s*MAX_DEPTH\s*\|\|\s*isSearching\}/)
})

test("Split button has disabled styling when searching", () => {
  // The className ternary includes isSearching for opacity-50 cursor-not-allowed
  assert.match(tooltipBlock, /cell\.depth\s*>=\s*MAX_DEPTH\s*\|\|\s*isSearching\s*\?\s*"opacity-50 cursor-not-allowed"/)
})

// ============================================================
// Merge button is disabled when searching
// ============================================================

test("Merge button disabled attribute is isSearching", () => {
  assert.match(tooltipBlock, /disabled=\{isSearching\}/)
})

test("Merge button has disabled styling when searching", () => {
  assert.match(tooltipBlock, /isSearching\s*\?\s*"opacity-50 cursor-not-allowed"\s*:\s*"hover:bg-accent"/)
})

// ============================================================
// getAvailableActions does not early-return for searching
// ============================================================

test("getAvailableActions does not early-return empty array for searching status", () => {
  const fnBlock = source.slice(
    source.indexOf("export function getAvailableActions"),
    source.indexOf("function formatShortDate"),
  )
  assert.doesNotMatch(fnBlock, /cell\.status\s*===\s*"searching"\)\s*return\s*\[\]/)
})

// ============================================================
// Search (Run) buttons remain disabled when searching (existing behavior preserved)
// ============================================================

test("search Run buttons are still disabled when isSearching", () => {
  assert.match(tooltipBlock, /const\s+disabled\s*=\s*!mechanism\.enabled\s*\|\|\s*isSearching/)
})
