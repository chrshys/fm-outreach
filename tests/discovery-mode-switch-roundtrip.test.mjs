import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const mapContentSource = fs.readFileSync("src/components/map/map-content.tsx", "utf8")
const discoveryGridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")

// ============================================================
// Switch to Clusters mode and back → discovery mode still works,
// virtual grid reappears
// ============================================================

// --- 1. listCells query stays subscribed across mode switches ---

test("listCells query is NOT gated on viewMode (stays warm in clusters mode)", () => {
  // The query condition should be `globalGridId ? { gridId: globalGridId } : "skip"`
  // NOT `globalGridId && viewMode === "discovery" ? ...`
  assert.match(
    pageSource,
    /globalGridId\s*\?\s*\{\s*gridId:\s*globalGridId\s*\}\s*:\s*"skip"/,
  )
  // Ensure viewMode is NOT part of the query condition
  assert.doesNotMatch(
    pageSource,
    /globalGridId\s*&&\s*viewMode\s*===\s*"discovery"\s*\?\s*\{\s*gridId:\s*globalGridId\s*\}/,
  )
})

test("listCells query uses useQuery with api.discovery.gridCells.listCells", () => {
  assert.match(pageSource, /useQuery\(\s*api\.discovery\.gridCells\.listCells/)
})

// --- 2. globalGridId is preserved when toggling modes ---

test("mode toggle does NOT reset globalGridId", () => {
  // Extract the mode toggle onClick block: from setViewMode through the closing }}
  const toggleMatch = pageSource.match(
    /setViewMode\(\(prev\)\s*=>\s*prev\s*===\s*"clusters"\s*\?\s*"discovery"\s*:\s*"clusters"\)([\s\S]*?)\}\}/,
  )
  assert.ok(toggleMatch, "expected to find viewMode toggle handler")
  const toggleBody = toggleMatch[1]
  assert.doesNotMatch(
    toggleBody,
    /setGlobalGridId/,
    "toggle handler must not call setGlobalGridId",
  )
})

// --- 3. Rendering is still gated on viewMode for gridCells prop ---

test("gridCells prop to MapContent is gated on discovery viewMode", () => {
  assert.match(
    pageSource,
    /gridCells=\{viewMode\s*===\s*"discovery"\s*\?\s*cells\s*\?\?\s*undefined\s*:\s*undefined\}/,
  )
})

test("onCellSelect prop to MapContent is gated on discovery viewMode", () => {
  assert.match(
    pageSource,
    /onCellSelect=\{viewMode\s*===\s*"discovery"\s*\?\s*handleCellSelect\s*:\s*undefined\}/,
  )
})

test("onActivateCell prop to MapContent is gated on discovery viewMode", () => {
  assert.match(
    pageSource,
    /onActivateCell=\{viewMode\s*===\s*"discovery"\s*\?\s*handleActivateCell\s*:\s*undefined\}/,
  )
})

// --- 4. MapContent renders DiscoveryGrid only when gridCells and onCellSelect are provided ---

test("MapContent conditionally renders DiscoveryGrid when gridCells and onCellSelect are truthy", () => {
  assert.match(mapContentSource, /\{gridCells\s*&&\s*onCellSelect\s*&&\s*\(/)
  assert.match(mapContentSource, /<DiscoveryGrid/)
})

test("MapContent does NOT render DiscoveryGrid when gridCells is undefined (clusters mode)", () => {
  // gridCells is undefined in clusters mode, so the conditional short-circuits
  assert.match(mapContentSource, /\{gridCells\s*&&/)
})

// --- 5. DiscoveryGrid eagerly initialises state from map (no blank flash on re-entry) ---

test("DiscoveryGrid initializes mapBounds eagerly from map (no empty frame on mount)", () => {
  assert.match(discoveryGridSource, /useState.*\(\(\)\s*=>\s*getMapBounds\(map\)\)/)
})

test("DiscoveryGrid initializes zoom eagerly from map state", () => {
  assert.match(discoveryGridSource, /useState\(\(\)\s*=>\s*map\.getZoom\(\)\)/)
})

// --- 6. Virtual grid computation still depends on zoom threshold ---

test("virtual cells are computed at zoom >= 8 (grid reappears when switching back)", () => {
  assert.match(discoveryGridSource, /zoom\s*<\s*8\)\s*return\s*\[\]/)
  assert.match(discoveryGridSource, /computeVirtualGrid\(mapBounds,\s*cellSizeKm\)/)
})

// --- 7. Clusters mode hides discovery-specific UI ---

test("clusters mode does not pass gridCells (undefined prevents DiscoveryGrid render)", () => {
  // viewMode === "discovery" ? cells ?? undefined : undefined
  // When in clusters mode, gridCells = undefined, so DiscoveryGrid does not render
  assert.match(
    pageSource,
    /gridCells=\{viewMode\s*===\s*"discovery"\s*\?\s*cells\s*\?\?\s*undefined\s*:\s*undefined\}/,
  )
})

test("clusters array is empty in discovery mode (clusters hidden)", () => {
  assert.match(
    pageSource,
    /clusters=\{viewMode\s*===\s*"clusters"\s*\?\s*filteredClusters\s*:\s*\[\]\}/,
  )
})

// --- 8. Mode toggle clears transient UI state but not grid data ---

test("mode toggle clears selectedCellId", () => {
  const toggleHandler = pageSource.match(
    /setViewMode\(\(prev\)\s*=>\s*prev\s*===\s*"clusters"\s*\?\s*"discovery"\s*:\s*"clusters"\)([\s\S]*?)\}\}/,
  )
  assert.ok(toggleHandler)
  assert.match(toggleHandler[1], /setSelectedCellId\(null\)/)
})

test("mode toggle clears isDrawing", () => {
  const toggleHandler = pageSource.match(
    /setViewMode\(\(prev\)\s*=>\s*prev\s*===\s*"clusters"\s*\?\s*"discovery"\s*:\s*"clusters"\)([\s\S]*?)\}\}/,
  )
  assert.ok(toggleHandler)
  assert.match(toggleHandler[1], /setIsDrawing\(false\)/)
})

test("mode toggle clears drawnPolygon", () => {
  const toggleHandler = pageSource.match(
    /setViewMode\(\(prev\)\s*=>\s*prev\s*===\s*"clusters"\s*\?\s*"discovery"\s*:\s*"clusters"\)([\s\S]*?)\}\}/,
  )
  assert.ok(toggleHandler)
  assert.match(toggleHandler[1], /setDrawnPolygon\(null\)/)
})

// --- 9. getOrCreateGlobalGrid is only called once (not on every re-entry) ---

test("auto-create effect only fires when globalGridId is null", () => {
  assert.match(
    pageSource,
    /viewMode\s*===\s*"discovery"\s*&&\s*globalGridId\s*===\s*null/,
  )
})

test("once globalGridId is set, re-entering discovery mode skips grid creation", () => {
  // The condition `globalGridId === null` ensures the mutation is not called again
  // after the first successful creation, even across mode switches
  assert.match(pageSource, /globalGridId\s*===\s*null/)
  assert.match(pageSource, /setGlobalGridId\(result\.gridId\)/)
})

// --- 10. Comment documents the intent of keeping query warm ---

test("source includes comment explaining query stays active across mode switches", () => {
  assert.match(
    pageSource,
    /active\s*across\s*mode/i,
  )
})
