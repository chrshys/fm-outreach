import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// DiscoveryPanel accepts selectedVirtualCell prop
// ============================================================

test("DiscoveryPanelProps includes selectedVirtualCell as optional VirtualCell | null", () => {
  assert.match(panelSource, /selectedVirtualCell\?:\s*VirtualCell\s*\|\s*null/)
})

test("panel imports VirtualCell type from virtual-grid", () => {
  assert.match(panelSource, /import\s+type\s+\{\s*VirtualCell\s*\}\s+from\s+["']@\/lib\/virtual-grid["']/)
})

test("DiscoveryPanel destructures selectedVirtualCell from props", () => {
  assert.match(panelSource, /selectedVirtualCell,/)
})

// ============================================================
// Map page passes selectedVirtualCell to DiscoveryPanel
// ============================================================

test("map page passes selectedVirtualCell to DiscoveryPanel", () => {
  assert.match(
    pageSource,
    /<DiscoveryPanel[\s\S]*?selectedVirtualCell=\{selectedVirtualCell\}/,
  )
})

// ============================================================
// Unified selectedCell derivation: persistedCell ?? virtual fallback
// ============================================================

test("panel derives persistedCell from cells.find", () => {
  assert.match(panelSource, /const persistedCell\s*=\s*cells\.find\(\(c\)\s*=>\s*c\._id\s*===\s*selectedCellId\)\s*\?\?\s*null/)
})

test("panel derives selectedCell with type CellData | null", () => {
  assert.match(panelSource, /const selectedCell:\s*CellData\s*\|\s*null\s*=\s*persistedCell\s*\?\?/)
})

test("virtual cell fallback uses selectedVirtualCell.key as _id", () => {
  assert.match(panelSource, /_id:\s*selectedVirtualCell\.key/)
})

test("virtual cell fallback maps swLat, swLng, neLat, neLng from selectedVirtualCell", () => {
  assert.match(panelSource, /swLat:\s*selectedVirtualCell\.swLat/)
  assert.match(panelSource, /swLng:\s*selectedVirtualCell\.swLng/)
  assert.match(panelSource, /neLat:\s*selectedVirtualCell\.neLat/)
  assert.match(panelSource, /neLng:\s*selectedVirtualCell\.neLng/)
})

test("virtual cell fallback sets depth to 0", () => {
  assert.match(panelSource, /depth:\s*0/)
})

test('virtual cell fallback sets status to "unsearched"', () => {
  assert.match(panelSource, /status:\s*"unsearched"\s*as\s*const/)
})

test("virtual cell fallback returns null when no selectedVirtualCell", () => {
  // The ternary should end with `: null)`
  assert.match(panelSource, /selectedVirtualCell\s*\?[\s\S]*?:\s*null\)/)
})

// ============================================================
// No separate virtual cell JSX section (unified into Selected Cell block)
// ============================================================

test("panel no longer has a separate 'Selected Virtual Cell' JSX section", () => {
  assert.doesNotMatch(panelSource, /Selected Virtual Cell/)
})

test("panel does not have a separate !selectedCell && selectedVirtualCell guard", () => {
  assert.doesNotMatch(panelSource, /!selectedCell\s*&&\s*selectedVirtualCell/)
})

// ============================================================
// Virtual cell renders correctly through unified Selected Cell section
// ============================================================

test("selectedCell with depth 0 hides Merge button (depth > 0 guard)", () => {
  assert.match(panelSource, /selectedCell\.depth\s*>\s*0/)
})

test("selectedCell with unsearched status shows status badge via getStatusBadgeColor", () => {
  assert.match(panelSource, /getStatusBadgeColor\(selectedCell\.status\)/)
})

test("selectedCell with unsearched status hides result count (status !== unsearched guard)", () => {
  assert.match(panelSource, /selectedCell\.status\s*!==\s*"unsearched"/)
})
