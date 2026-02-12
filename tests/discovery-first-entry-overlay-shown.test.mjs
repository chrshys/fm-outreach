import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")
const mapContentSource = fs.readFileSync("src/components/map/map-content.tsx", "utf8")
const virtualGridSource = fs.readFileSync("src/lib/virtual-grid.ts", "utf8")

// ============================================================
// Verify that when DiscoveryGrid receives an empty cells array
// (as happens on first discovery entry), virtual cells still
// render. This is the "overlay shown" part of the flow.
// ============================================================

// -- Virtual grid utility generates cells for valid bounds --

test("computeVirtualGrid returns VirtualCell[] type", () => {
  assert.match(
    virtualGridSource,
    /export function computeVirtualGrid[\s\S]*?:\s*VirtualCell\[\]/,
  )
})

test("computeVirtualGrid computes latStep from cellSizeKm / 111", () => {
  assert.match(
    virtualGridSource,
    /latStep\s*=\s*cellSizeKm\s*\/\s*111/,
  )
})

test("computeVirtualGrid snaps start coordinates to grid alignment", () => {
  assert.match(virtualGridSource, /Math\.floor\(bounds\.swLat\s*\/\s*latStep\)\s*\*\s*latStep/)
  assert.match(virtualGridSource, /Math\.floor\(bounds\.swLng\s*\/\s*lngStep\)\s*\*\s*lngStep/)
})

// -- DiscoveryGrid renders virtual overlay even with no persisted cells --

test("DiscoveryGrid does not require non-empty cells array to render virtual cells", () => {
  // The virtual cell computation only depends on mapBounds and cellSizeKm,
  // not on the cells array being non-empty
  const virtualCellsComputation = gridSource.match(
    /virtualCells\s*=\s*useMemo\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[([^\]]*)\]\)/,
  )
  assert.ok(virtualCellsComputation, "virtualCells useMemo should exist")
  const deps = virtualCellsComputation[2]
  // Should NOT depend on cells
  assert.doesNotMatch(deps, /\bcells\b/, "virtualCells should not depend on cells array")
  // Should depend on mapBounds and cellSizeKm
  assert.match(deps, /mapBounds/, "virtualCells should depend on mapBounds")
  assert.match(deps, /cellSizeKm/, "virtualCells should depend on cellSizeKm")
})

test("filteredVirtualCells gracefully handles empty cells array", () => {
  // The spatial overlap check iterates cells.some(...). When cells is [],
  // cells.some() always returns false, so all virtual cells pass the filter.
  assert.match(
    gridSource,
    /filteredVirtualCells\s*=\s*useMemo/,
    "filteredVirtualCells useMemo should exist",
  )
  // Uses cells.some which returns false for empty array — all virtual cells pass
  assert.match(
    gridSource,
    /!cells\.some/,
    "filter should use cells.some for spatial overlap check",
  )
})

// -- DiscoveryGrid renders both virtual and persisted cells --

test("DiscoveryGrid renders persisted cells only at zoom >= 8", () => {
  assert.match(
    gridSource,
    /zoom\s*>=\s*8\s*&&\s*cells\.map/,
  )
})

test("DiscoveryGrid renders virtual cells from filteredVirtualCells", () => {
  assert.match(
    gridSource,
    /filteredVirtualCells\.map\(\(vc\)/,
  )
})

// -- MapContent wraps DiscoveryGrid in a Pane for z-ordering --

test("MapContent wraps DiscoveryGrid in a Pane with discovery-grid name", () => {
  assert.match(
    mapContentSource,
    /<Pane\s+name="discovery-grid"/,
  )
})

test("MapContent discovery-grid Pane has z-index 450", () => {
  assert.match(
    mapContentSource,
    /name="discovery-grid"\s+style=\{\{\s*zIndex:\s*450\s*\}\}/,
  )
})

// -- DiscoveryGrid tracks zoom state for conditional rendering --

test("DiscoveryGrid initializes zoom from map.getZoom()", () => {
  assert.match(
    gridSource,
    /const\s+\[zoom,\s*setZoom\]\s*=\s*useState\(\(\)\s*=>\s*map\.getZoom\(\)\)/,
  )
})

test("DiscoveryGrid updates zoom on zoomend event", () => {
  assert.match(
    gridSource,
    /useMapEvents\(\{[\s\S]*?zoomend/,
  )
})

test("DiscoveryGrid updates bounds on moveend event", () => {
  assert.match(
    gridSource,
    /useMapEvents\(\{[\s\S]*?moveend/,
  )
})
