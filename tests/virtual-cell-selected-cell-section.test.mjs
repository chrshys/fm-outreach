import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)

// ============================================================
// Selecting a virtual cell shows "Selected Cell" section with
// unsearched status and d0 depth
// ============================================================

test("virtual cell fallback synthesizes CellData with depth 0 and unsearched status", () => {
  // The derivation builds a synthetic CellData when selectedVirtualCell is set
  // and no persisted cell matches
  assert.match(
    panelSource,
    /persistedCell\s*\?\?\s*\(selectedVirtualCell\s*\?/,
    "selectedCell should fall back to virtual cell when no persisted cell found",
  )
  assert.match(panelSource, /depth:\s*0/, "virtual cell fallback depth must be 0")
  assert.match(
    panelSource,
    /status:\s*"unsearched"/,
    'virtual cell fallback status must be "unsearched"',
  )
})

test("Selected Cell section renders when selectedCell is non-null", () => {
  // The guard `{selectedCell && (` controls visibility of the entire section
  assert.match(panelSource, /\{selectedCell\s*&&\s*\(/)
  assert.match(panelSource, /Selected Cell/)
})

test("status badge displays selectedCell.status text", () => {
  // The badge renders the literal status string (e.g. "unsearched")
  assert.match(panelSource, /\{selectedCell\.status\}/)
})

test("depth indicator renders as d{selectedCell.depth}", () => {
  // For virtual cells this will display "d0"
  assert.match(panelSource, /d\{selectedCell\.depth\}/)
})

test("result count is hidden when status is unsearched", () => {
  // Guard: only show results when status !== "unsearched"
  assert.match(panelSource, /selectedCell\.status\s*!==\s*"unsearched"/)
})

test("unsearched status badge gets gray styling", () => {
  const sharedSource = fs.readFileSync(
    "src/components/map/discovery-grid-shared.ts",
    "utf8",
  )
  assert.match(
    sharedSource,
    /case\s*"unsearched":\s*return\s*"bg-gray-200\s+text-gray-700"/,
  )
})

test("virtual cell selectedCell has no parentCellId so Merge button is hidden (depth > 0 guard)", () => {
  // Merge button only renders when depth > 0; virtual cells have depth 0
  assert.match(panelSource, /selectedCell\.depth\s*>\s*0/)
})

test("Split button is enabled for virtual cell (depth 0 < MAX_DEPTH)", () => {
  // Split disabled when depth >= MAX_DEPTH; depth 0 means it's enabled
  assert.match(panelSource, /selectedCell\.depth\s*>=\s*MAX_DEPTH/)
})
