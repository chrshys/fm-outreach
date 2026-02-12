import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const mapPageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const mapContentSource = fs.readFileSync(
  "src/components/map/map-content.tsx",
  "utf8",
)
const discoveryPanelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const discoveryGridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// --- View mode toggle ---

test("map page initializes viewMode state as clusters", () => {
  assert.match(
    mapPageSource,
    /useMapStore\(\(s\)\s*=>\s*s\.viewMode\)/,
  )
})

test("map page has a toggle button switching between clusters and discovery", () => {
  assert.match(mapPageSource, /setViewMode\(/)
  assert.match(
    mapPageSource,
    /viewMode\s*===\s*"clusters"\s*\?\s*"discovery"\s*:\s*"clusters"/,
  )
})

test("toggle button shows opposite mode label", () => {
  assert.match(
    mapPageSource,
    /viewMode\s*===\s*"clusters"\s*\?\s*"Discovery"\s*:\s*"Clusters"/,
  )
})

test("view mode toggle clears selectedCellId", () => {
  // The onClick handler for the view toggle button should call setSelectedCellId(null)
  // to clear any cell selection when switching between clusters and discovery modes
  const toggleMatch = mapPageSource.match(
    /setViewMode\(viewMode\s*===\s*"clusters"\s*\?\s*"discovery"\s*:\s*"clusters"\)([\s\S]*?)\}\}/,
  )
  assert.ok(toggleMatch, "view mode toggle onClick handler should exist")
  assert.match(
    toggleMatch[1],
    /setSelectedCellId\(null\)/,
    "view mode toggle should clear selectedCellId",
  )
})

// --- Cluster mode rendering ---

test("cluster mode passes filteredClusters to MapContent", () => {
  assert.match(
    mapPageSource,
    /clusters=\{viewMode\s*===\s*"clusters"\s*\?\s*filteredClusters\s*:\s*\[\]\}/,
  )
})

test("cluster mode shows MapFilters sidebar", () => {
  assert.match(mapPageSource, /viewMode\s*===\s*"clusters"\s*\?\s*\(\s*<MapFilters/)
})

test("cluster mode shows Draw Cluster button", () => {
  assert.match(mapPageSource, /viewMode\s*===\s*"clusters"\s*&&/)
  assert.match(mapPageSource, /Draw Cluster/)
})

// --- Discovery mode rendering ---

test("discovery mode passes cells to MapContent", () => {
  assert.match(
    mapPageSource,
    /gridCells=\{viewMode\s*===\s*"discovery"\s*\?\s*cells\s*\?\?\s*undefined\s*:\s*undefined\}/,
  )
})

test("discovery mode passes onCellSelect to MapContent", () => {
  assert.match(
    mapPageSource,
    /onCellSelect=\{viewMode\s*===\s*"discovery"\s*\?\s*handleCellSelect\s*:\s*undefined\}/,
  )
})

test("discovery mode shows DiscoveryPanel sidebar", () => {
  assert.match(mapPageSource, /<DiscoveryPanel/)
  assert.match(mapPageSource, /globalGridId=\{globalGridId\}/)
})

test("gridCells query stays active across mode switches (gated only on globalGridId)", () => {
  assert.match(
    mapPageSource,
    /globalGridId\s*\?\s*\{\s*gridId:\s*globalGridId\s*\}\s*:\s*"skip"/,
  )
})

// --- MapContent renders both modes without error ---

test("MapContent accepts optional gridCells, selectedCellId, and onCellSelect props", () => {
  assert.match(mapContentSource, /gridCells\?:\s*CellData\[\]/)
  assert.match(mapContentSource, /selectedCellId\?:\s*string\s*\|\s*null/)
  assert.match(mapContentSource, /onCellSelect\?:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
})

test("MapContent conditionally renders DiscoveryGrid when gridCells and onCellSelect provided", () => {
  assert.match(
    mapContentSource,
    /\{gridCells\s*&&\s*onCellSelect\s*&&\s*\(/,
  )
  assert.match(mapContentSource, /<DiscoveryGrid\s+cells=\{gridCells\}/)
})

test("MapContent accepts optional clusters prop with default empty array", () => {
  assert.match(mapContentSource, /clusters\s*=\s*\[\]/)
})

test("MapContent renders cluster polygons from clusters prop", () => {
  assert.match(mapContentSource, /clusters\.filter\(\(c\)\s*=>\s*c\.boundary\)\.map\(/)
})

test("MapContent conditionally renders MapBoundsEmitter", () => {
  assert.match(
    mapContentSource,
    /\{onBoundsChange\s*&&\s*\(\s*<MapBoundsEmitter/,
  )
})

test("MapContent conditionally renders PolygonDraw", () => {
  assert.match(
    mapContentSource,
    /\{onPolygonDrawn\s*&&\s*\(\s*<PolygonDraw/,
  )
})

// --- DiscoveryGrid component ---

test("DiscoveryGrid renders Rectangle for each cell", () => {
  assert.match(discoveryGridSource, /cells\.map\(\(cell\)/)
  assert.match(discoveryGridSource, /<Rectangle/)
})

test("DiscoveryGrid uses getCellColor for path options", () => {
  assert.match(discoveryGridSource, /getCellColor\(cell\.status\)/)
})

test("DiscoveryGrid renders Rectangle with pathOptions from getCellColor", () => {
  assert.match(discoveryGridSource, /getCellColor\(cell\.status\)/)
  assert.match(discoveryGridSource, /pathOptions=\{/)
})

test("DiscoveryGrid does not use Tooltip", () => {
  assert.doesNotMatch(discoveryGridSource, /Tooltip/)
})

// --- DiscoveryPanel component ---

test("DiscoveryPanel accepts globalGridId prop (setGlobalGridId removed)", () => {
  assert.match(discoveryPanelSource, /globalGridId:\s*Id<"discoveryGrids">\s*\|\s*null/)
  assert.doesNotMatch(discoveryPanelSource, /setGlobalGridId/)
})

test("DiscoveryPanel queries listGrids", () => {
  assert.match(discoveryPanelSource, /useQuery\(api\.discovery\.gridCells\.listGrids\)/)
})

test("DiscoveryPanel has grid creation form with name, region, province inputs", () => {
  assert.match(discoveryPanelSource, /placeholder="Grid name"/)
  assert.match(discoveryPanelSource, /placeholder="Region"/)
  assert.match(discoveryPanelSource, /placeholder="Province"/)
})

test("DiscoveryPanel shows progress stats for selected grid", () => {
  assert.match(discoveryPanelSource, /selectedGrid\.searchedCount/)
  assert.match(discoveryPanelSource, /selectedGrid\.totalLeafCells/)
  assert.match(discoveryPanelSource, /selectedGrid\.saturatedCount/)
  assert.match(discoveryPanelSource, /selectedGrid\.totalLeadsFound/)
})

test("DiscoveryPanel displays cell status color legend", () => {
  assert.match(discoveryPanelSource, /CELL_STATUS_LEGEND/)
  assert.match(discoveryPanelSource, /Unsearched/)
  assert.match(discoveryPanelSource, /Searching/)
  assert.match(discoveryPanelSource, /Searched/)
  assert.match(discoveryPanelSource, /Saturated/)
})

// --- Cell click handlers ---

test("handleCellAction routes search action for google_places mechanism to requestDiscoverCell", () => {
  assert.match(mapPageSource, /action\.mechanism\s*!==\s*"google_places"/)
  assert.match(mapPageSource, /requestDiscoverCell\(\{/)
})

test("handleCellAction routes subdivide action to subdivideCell", () => {
  assert.match(mapPageSource, /action\.type\s*===\s*"subdivide"/)
  assert.match(mapPageSource, /subdivideCell\(\{/)
})

test("handleCellAction shows toast for already-searching cells", () => {
  assert.match(mapPageSource, /cell\.status\s*===\s*"searching"/)
  assert.match(mapPageSource, /toast\.info\("Search already in progress"\)/)
})

// --- No runtime errors in conditional rendering ---

test("grid cells are undefined (not null) when not in discovery mode", () => {
  // Ensures MapContent gets undefined (not null) for gridCells, preventing
  // accidental iteration over null
  assert.match(
    mapPageSource,
    /gridCells=\{viewMode\s*===\s*"discovery"\s*\?\s*cells\s*\?\?\s*undefined\s*:\s*undefined\}/,
  )
})

test("cluster array is empty (not undefined) when in discovery mode", () => {
  // Ensures MapContent gets [] for clusters in discovery mode, preventing
  // errors in .filter().map() chain
  assert.match(
    mapPageSource,
    /clusters=\{viewMode\s*===\s*"clusters"\s*\?\s*filteredClusters\s*:\s*\[\]\}/,
  )
})

test("MapContent guards DiscoveryGrid render with both gridCells and onCellSelect", () => {
  // Both must be truthy to render, preventing crashes when either is undefined
  assert.match(
    mapContentSource,
    /gridCells\s*&&\s*onCellSelect/,
  )
})

test("leads always renders regardless of view mode", () => {
  // leads.map is unconditional - markers show in both modes
  assert.match(mapContentSource, /leads\.map\(/)
  // Verify no viewMode conditional wrapping leads rendering
  assert.doesNotMatch(mapContentSource, /viewMode.*leads\.map/)
})
