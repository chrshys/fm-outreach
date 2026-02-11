import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// Extract the CellTooltipContent function body for targeted assertions
const tooltipStart = source.indexOf("function CellTooltipContent")
const nextFnStart = source.indexOf(
  "/** Delay in ms before the tooltip closes",
)
const tooltipBlock = source.slice(tooltipStart, nextFnStart)

// ============================================================
// Split button is always rendered (not conditionally hidden)
// ============================================================

test("split button is not conditionally hidden by depth check", () => {
  // The old pattern wrapped the split button in {cell.depth < MAX_DEPTH && (...)}
  // which completely hid it at max depth. Ensure that pattern is gone.
  const hiddenPattern = /\{cell\.depth\s*<\s*MAX_DEPTH\s*&&\s*\(\s*<button/
  assert.doesNotMatch(tooltipBlock, hiddenPattern)
})

test("split button element exists unconditionally in tooltip", () => {
  // The button with Grid2x2Plus and "Split" text should exist without
  // being wrapped in a depth conditional.
  assert.match(tooltipBlock, /Grid2x2Plus/)
  assert.match(tooltipBlock, /Split/)
})

// ============================================================
// Split button is disabled at max depth
// ============================================================

test("split button has disabled attribute tied to max depth", () => {
  assert.match(tooltipBlock, /disabled=\{cell\.depth\s*>=\s*MAX_DEPTH\}/)
})

test("split button shows disabled styling at max depth", () => {
  // Should have opacity-50 and cursor-not-allowed for disabled state
  assert.match(tooltipBlock, /opacity-50/)
  assert.match(tooltipBlock, /cursor-not-allowed/)
})

test("split button has title hint when at max depth", () => {
  assert.match(tooltipBlock, /title=\{cell\.depth\s*>=\s*MAX_DEPTH\s*\?/)
  assert.match(tooltipBlock, /Maximum depth reached/)
})

// ============================================================
// Split button still works at non-max depths
// ============================================================

test("split button has hover:bg-accent for non-max-depth cells", () => {
  assert.match(tooltipBlock, /hover:bg-accent/)
})

test("split button still triggers subdivide action on click", () => {
  assert.match(tooltipBlock, /onCellAction\(cell\._id,\s*\{\s*type:\s*"subdivide"\s*\}\)/)
})
