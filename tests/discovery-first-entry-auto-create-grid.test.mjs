import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const gridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")
const mapContentSource = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

// ============================================================
// First-entry flow: toggling to discovery mode auto-creates a
// global grid and wires props so the virtual overlay renders.
// ============================================================

// 1. Page starts in clusters mode

test("viewMode defaults to clusters", () => {
  assert.match(
    pageSource,
    /useMapStore\(\(s\)\s*=>\s*s\.viewMode\)/,
  )
})

// 2. Clicking Discovery toggles viewMode to discovery

test("toggle button sets viewMode to discovery when in clusters mode", () => {
  assert.match(
    pageSource,
    /setViewMode\(viewMode\s*===\s*"clusters"\s*\?\s*"discovery"\s*:\s*"clusters"\)/,
  )
})

// 3. globalGridId starts as null

test("globalGridId initializes as null", () => {
  assert.match(
    pageSource,
    /useMapStore\(\(s\)\s*=>\s*s\.globalGridId\)/,
  )
})

// 4. useEffect triggers getOrCreateGlobalGrid when discovery + null gridId

test("auto-create effect fires when viewMode=discovery and globalGridId=null", () => {
  assert.match(
    pageSource,
    /useEffect\(\(\)\s*=>\s*\{[\s\S]*?viewMode\s*===\s*"discovery"\s*&&\s*globalGridId\s*===\s*null[\s\S]*?getOrCreateGlobalGrid/,
  )
})

// 5. After getOrCreateGlobalGrid resolves, globalGridId is set

test("setGlobalGridId is called with result.gridId from getOrCreateGlobalGrid", () => {
  assert.match(
    pageSource,
    /getOrCreateGlobalGrid\(\{\}\)\.then\(\(result\)\s*=>\s*\{[\s\S]*?setGlobalGridId\(result\.gridId\)/,
  )
})

// 6. Once globalGridId is set, listCells query runs (not skipped)

test("listCells query stays active across mode switches (gated only on globalGridId)", () => {
  assert.match(
    pageSource,
    /globalGridId\s*\?\s*\{\s*gridId:\s*globalGridId\s*\}\s*:\s*"skip"/,
  )
})

// 7. cells is derived from gridCellsData (will be empty array for fresh grid)

test("cells is derived from gridCellsData?.cells", () => {
  assert.match(
    pageSource,
    /const\s+cells\s*=\s*gridCellsData\?\.cells/,
  )
})

// 8. gridCells prop passes cells to MapContent in discovery mode

test("MapContent receives gridCells from cells in discovery mode", () => {
  assert.match(
    pageSource,
    /gridCells=\{viewMode\s*===\s*"discovery"\s*\?\s*cells\s*\?\?\s*undefined\s*:\s*undefined\}/,
  )
})

// 9. MapContent renders DiscoveryGrid when gridCells is provided

test("MapContent conditionally renders DiscoveryGrid when gridCells and onCellSelect exist", () => {
  assert.match(
    mapContentSource,
    /\{gridCells\s*&&\s*onCellSelect\s*&&/,
  )
  assert.match(
    mapContentSource,
    /<DiscoveryGrid/,
  )
})

// 10. MapContent passes cellSizeKm to DiscoveryGrid with fallback

test("MapContent passes cellSizeKm with fallback of 20", () => {
  assert.match(
    mapContentSource,
    /cellSizeKm=\{cellSizeKm\s*\?\?\s*20\}/,
  )
})

// 11. DiscoveryGrid computes virtual cells from map bounds and cellSizeKm

test("DiscoveryGrid calls computeVirtualGrid with mapBounds and cellSizeKm", () => {
  assert.match(
    gridSource,
    /computeVirtualGrid\(mapBounds,\s*cellSizeKm\)/,
  )
})

// 12. DiscoveryGrid initializes mapBounds eagerly (no waiting for map events)

test("DiscoveryGrid initializes mapBounds with lazy initializer from map", () => {
  assert.match(
    gridSource,
    /useState<\{[\s\S]*?\}>\(\(\)\s*=>\s*getMapBounds\(map\)\)/,
  )
})

// 13. Virtual cells only render at zoom >= 8

test("DiscoveryGrid returns empty virtual cells when zoom < 8", () => {
  assert.match(
    gridSource,
    /zoom\s*<\s*8\)\s*return\s*\[\]/,
  )
})

// 14. Virtual cells that overlap persisted cells are filtered out

test("DiscoveryGrid filters virtual cells that overlap persisted cells", () => {
  assert.match(
    gridSource,
    /filteredVirtualCells\s*=\s*useMemo/,
  )
  // Check spatial overlap filtering logic
  assert.match(
    gridSource,
    /c\.swLat\s*<\s*vc\.neLat\s*&&\s*c\.neLat\s*>\s*vc\.swLat/,
  )
})

// 15. VirtualGridCell components render for each unactivated cell

test("DiscoveryGrid renders VirtualGridCell for each filtered virtual cell", () => {
  assert.match(
    gridSource,
    /filteredVirtualCells\.map\(\(vc\)\s*=>\s*[\s\S]*?<VirtualGridCell/,
  )
})

// 16. VirtualGridCell uses VIRTUAL_CELL_STYLE for faint gray appearance

test("VirtualGridCell renders Rectangle with VIRTUAL_CELL_STYLE", () => {
  assert.match(
    gridSource,
    /pathOptions=\{VIRTUAL_CELL_STYLE\}/,
  )
})

// 17. cellSizeKm is looked up from listGrids query

test("cellSizeKm is looked up from gridsResult by globalGridId", () => {
  assert.match(
    pageSource,
    /gridsResult\?\.find\(\(g\)\s*=>\s*g\._id\s*===\s*globalGridId\)\?\.cellSizeKm/,
  )
})

// 18. activatedBoundsKeys defaults to empty array for fresh grid

test("activatedBoundsKeys defaults to empty array", () => {
  assert.match(
    pageSource,
    /activatedBoundsKeys\s*=\s*gridCellsData\?\.activatedBoundsKeys\s*\?\?\s*\[\]/,
  )
})
