import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// =============================================================================
// 1. Map click handler deselects both persisted and virtual cells
// =============================================================================

test("useMapEvents includes a click handler", () => {
  assert.match(gridSource, /useMapEvents\(\{[\s\S]*?click:\s*\(\)\s*=>\s*\{/)
})

test("map click handler calls onCellSelect(null) to deselect persisted cell", () => {
  const mapEventsIdx = gridSource.indexOf("useMapEvents({")
  assert.ok(mapEventsIdx > -1)
  const afterMapEvents = gridSource.slice(mapEventsIdx, mapEventsIdx + 400)
  assert.match(afterMapEvents, /onCellSelect\(null\)/)
})

test("map click handler calls onSelectVirtualCell(null) to deselect virtual cell", () => {
  const mapEventsIdx = gridSource.indexOf("useMapEvents({")
  assert.ok(mapEventsIdx > -1)
  const afterMapEvents = gridSource.slice(mapEventsIdx, mapEventsIdx + 400)
  assert.match(afterMapEvents, /onSelectVirtualCell\(null\)/)
})

// =============================================================================
// 2. Cell click handlers stop propagation to prevent map deselect
// =============================================================================

test("imports L from leaflet for DomEvent.stopPropagation", () => {
  assert.match(gridSource, /import\s+L\s+from\s+"leaflet"/)
})

test("DiscoveryGridCell click handler stops propagation", () => {
  const cellFnIdx = gridSource.indexOf("function DiscoveryGridCell")
  assert.ok(cellFnIdx > -1)
  const cellFn = gridSource.slice(cellFnIdx, cellFnIdx + 800)
  assert.match(cellFn, /L\.DomEvent\.stopPropagation\(e\)/)
})

test("VirtualGridCell click handler stops propagation", () => {
  const cellFnIdx = gridSource.indexOf("function VirtualGridCell")
  assert.ok(cellFnIdx > -1)
  const cellFn = gridSource.slice(cellFnIdx, cellFnIdx + 600)
  assert.match(cellFn, /L\.DomEvent\.stopPropagation\(e\)/)
})

test("cell click handlers take event parameter (e)", () => {
  // Both cell types should use (e) => { pattern for their click handlers
  const virtualIdx = gridSource.indexOf("function VirtualGridCell")
  const persistedIdx = gridSource.indexOf("function DiscoveryGridCell")
  const virtualFn = gridSource.slice(virtualIdx, virtualIdx + 600)
  const persistedFn = gridSource.slice(persistedIdx, persistedIdx + 800)
  assert.match(virtualFn, /click:\s*\(e\)\s*=>\s*\{/)
  assert.match(persistedFn, /click:\s*\(e\)\s*=>\s*\{/)
})
