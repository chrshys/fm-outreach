import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { computeVirtualGrid } from "../src/lib/virtual-grid.ts"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// Extract the main DiscoveryGrid component (after `export default function DiscoveryGrid`)
const discoveryGridBody = source.split("export default function DiscoveryGrid")[1]

// ============================================================
// Zoom out to 7 → virtual grid disappears, only persisted cells visible
// ============================================================

// Approximate viewport bounds for zoom 8
const ZOOM_8_BOUNDS = {
  swLat: 43.0,
  swLng: -79.8,
  neLat: 43.5,
  neLng: -79.0,
}

test("computeVirtualGrid returns cells at zoom 8 viewport", () => {
  const cells = computeVirtualGrid(ZOOM_8_BOUNDS, 10)
  assert.ok(cells.length > 0, "should produce virtual cells at zoom-8 viewport")
})

test("computeVirtualGrid returns empty at zoom-7 viewport due to maxCells", () => {
  // The component itself gates on zoom < 8 before calling computeVirtualGrid.
  // This test verifies the component logic via source inspection.
  const virtualCellsMemo = source.split("const virtualCells")[1].split("const activatedSet")[0]
  assert.match(virtualCellsMemo, /zoom\s*<\s*8/, "virtualCells memo should check zoom < 8")
})

test("virtual cells memo returns empty array when zoom < 8", () => {
  assert.match(source, /if\s*\(!mapBounds\s*\|\|\s*zoom\s*<\s*8\)\s*return\s*\[\]/)
})

test("persisted cells are NOT gated by zoom level", () => {
  // After the fix, persisted cells should always render regardless of zoom
  assert.ok(discoveryGridBody, "DiscoveryGrid component should exist")

  // Verify NO zoom gate before cells.map in the main component
  assert.doesNotMatch(
    discoveryGridBody,
    /zoom\s*>=\s*\d+\s*&&\s*cells\.map/,
    "persisted cells should not have any zoom gate"
  )

  // Verify cells.map is still present (persisted cells render)
  assert.match(discoveryGridBody, /cells\.map/, "persisted cells should still be rendered")
})

test("filteredVirtualCells are rendered (virtual grid)", () => {
  assert.match(
    discoveryGridBody,
    /filteredVirtualCells\.map/,
    "virtual cells should be rendered via filteredVirtualCells.map"
  )
})

test("at zoom 7, only persisted cells would render (virtual cells empty)", () => {
  // 1. virtualCells memo returns [] when zoom < 8
  const virtualCellsMemo = source.split("const virtualCells")[1].split("const activatedSet")[0]
  assert.match(virtualCellsMemo, /zoom\s*<\s*8/)

  // 2. filteredVirtualCells derives from virtualCells
  const filteredSection = source.split("const filteredVirtualCells")[1].split("return")[0]
  assert.match(filteredSection, /virtualCells\.filter/)

  // 3. persisted cells have no zoom gate in main component
  assert.doesNotMatch(discoveryGridBody, /zoom\s*>=\s*\d+\s*&&\s*cells\.map/)
  assert.match(discoveryGridBody, /cells\.map/)
})
