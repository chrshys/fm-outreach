import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// Discovery Panel imports from discovery-grid
// ============================================================

test("panel imports CellData and CellAction types from discovery-grid", () => {
  assert.match(panelSource, /import\s+type\s+\{.*CellData.*CellAction.*\}\s+from\s+["']\.\/discovery-grid["']/)
})

test("panel imports DISCOVERY_MECHANISMS from discovery-grid", () => {
  assert.match(panelSource, /import\s+\{.*DISCOVERY_MECHANISMS.*\}\s+from\s+["']\.\/discovery-grid["']/)
})

test("panel imports MAX_DEPTH from discovery-grid", () => {
  assert.match(panelSource, /import\s+\{.*MAX_DEPTH.*\}\s+from\s+["']\.\/discovery-grid["']/)
})

test("panel imports getStatusBadgeColor from discovery-grid", () => {
  assert.match(panelSource, /import\s+\{.*getStatusBadgeColor.*\}\s+from\s+["']\.\/discovery-grid["']/)
})

test("panel imports formatShortDate from discovery-grid", () => {
  assert.match(panelSource, /import\s+\{.*formatShortDate.*\}\s+from\s+["']\.\/discovery-grid["']/)
})

test("panel imports Play, Grid2x2Plus, Minimize2 icons", () => {
  assert.match(panelSource, /Play/)
  assert.match(panelSource, /Grid2x2Plus/)
  assert.match(panelSource, /Minimize2/)
})

// ============================================================
// Discovery Panel props
// ============================================================

test("DiscoveryPanelProps includes cells: CellData[]", () => {
  assert.match(panelSource, /cells:\s*CellData\[\]/)
})

test("DiscoveryPanelProps includes selectedCellId: string | null", () => {
  assert.match(panelSource, /selectedCellId:\s*string\s*\|\s*null/)
})

test("DiscoveryPanelProps includes onCellAction", () => {
  assert.match(panelSource, /onCellAction:\s*\(cellId:\s*string,\s*action:\s*CellAction\)\s*=>\s*void/)
})

test("DiscoveryPanel function destructures cells, selectedCellId, onCellAction", () => {
  assert.match(panelSource, /cells,\s*selectedCellId,\s*onCellAction/)
})

// ============================================================
// Selected cell derivation
// ============================================================

test("panel derives selectedCell from cells and selectedCellId", () => {
  assert.match(panelSource, /cells\.find\(\(c\)\s*=>\s*c\._id\s*===\s*selectedCellId\)/)
})

// ============================================================
// Selected Cell section renders when cell is selected
// ============================================================

test("panel renders Selected Cell label", () => {
  assert.match(panelSource, /Selected Cell/)
})

test("panel uses getStatusBadgeColor for selected cell status", () => {
  assert.match(panelSource, /getStatusBadgeColor\(selectedCell\.status\)/)
})

test("panel shows result count for non-unsearched cells", () => {
  assert.match(panelSource, /selectedCell\.resultCount/)
})

test("panel shows depth indicator", () => {
  assert.match(panelSource, /selectedCell\.depth/)
})

// ============================================================
// Mechanism rows with Run buttons
// ============================================================

test("panel iterates over DISCOVERY_MECHANISMS", () => {
  assert.match(panelSource, /DISCOVERY_MECHANISMS\.map/)
})

test("panel shows Run button with Play icon for each mechanism", () => {
  assert.match(panelSource, /<Play/)
  assert.match(panelSource, /Run/)
})

test("Run button calls onCellAction with search action", () => {
  assert.match(panelSource, /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"search",\s*mechanism:\s*mechanism\.id\s*\}\)/)
})

test("Run button is disabled when mechanism is not enabled or cell is searching", () => {
  assert.match(panelSource, /!mechanism\.enabled\s*\|\|\s*selectedCell\.status\s*===\s*"searching"/)
})

test("panel uses formatShortDate for google_places last run", () => {
  assert.match(panelSource, /formatShortDate\(selectedCell\.lastSearchedAt\)/)
})

// ============================================================
// Split and Merge buttons
// ============================================================

test("Split button calls onCellAction with subdivide action", () => {
  assert.match(panelSource, /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"subdivide"\s*\}\)/)
})

test("Split button is disabled at MAX_DEPTH", () => {
  assert.match(panelSource, /selectedCell\.depth\s*>=\s*MAX_DEPTH/)
})

test("Split button uses Grid2x2Plus icon", () => {
  assert.match(panelSource, /<Grid2x2Plus/)
})

test("Merge button calls onCellAction with undivide action", () => {
  assert.match(panelSource, /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"undivide"\s*\}\)/)
})

test("Merge button only shown when depth > 0", () => {
  assert.match(panelSource, /selectedCell\.depth\s*>\s*0/)
})

test("Merge button uses Minimize2 icon", () => {
  assert.match(panelSource, /<Minimize2/)
})

// ============================================================
// Query saturation display
// ============================================================

test("panel shows query saturation when available", () => {
  assert.match(panelSource, /selectedCell\.querySaturation/)
})

// ============================================================
// Map page wires props to DiscoveryPanel
// ============================================================

test("map page passes cells to DiscoveryPanel", () => {
  assert.match(pageSource, /cells=\{cells\s*\?\?\s*\[\]\}/)
})

test("map page passes selectedCellId to DiscoveryPanel", () => {
  assert.match(pageSource, /<DiscoveryPanel[\s\S]*?selectedCellId=\{selectedCellId\}/)
})

test("map page passes onCellAction to DiscoveryPanel", () => {
  assert.match(pageSource, /<DiscoveryPanel[\s\S]*?onCellAction=\{handleCellAction\}/)
})

// ============================================================
// Map page clears selection on grid change
// ============================================================

test("map page clears selectedCellId via useEffect when globalGridId changes", () => {
  assert.match(
    pageSource,
    /useEffect\(\(\)\s*=>\s*\{\s*setSelectedCellId\(null\)\s*\},\s*\[globalGridId\]\)/,
  )
})

test("map page does not pass setGlobalGridId to DiscoveryPanel (auto-select removed)", () => {
  assert.doesNotMatch(pageSource, /setGlobalGridId=\{setGlobalGridId\}/)
})

// ============================================================
// Map page clears selection on view mode toggle
// ============================================================

test("map page clears selectedCellId when toggling view mode", () => {
  // Find the view mode toggle onClick handler
  const toggleMatch = pageSource.match(/setViewMode\([\s\S]*?setDrawnPolygon\(null\)[\s\S]*?setSelectedCellId\(null\)/)
  assert.ok(toggleMatch, "setSelectedCellId(null) should be in the view mode toggle handler")
})

// ============================================================
// Map page clears selection after subdivide and undivide
// ============================================================

test("map page clears selectedCellId after successful subdivide", () => {
  const subdivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(subdivideBlock, /toast\.success\("Cell subdivided/)
  assert.match(subdivideBlock, /setSelectedCellId\(null\)/)
})

test("map page clears selectedCellId after successful undivide", () => {
  const undivideIdx = pageSource.indexOf('action.type === "undivide"')
  const undivideBlock = pageSource.slice(undivideIdx, undivideIdx + 400)
  assert.match(undivideBlock, /toast\.success\("Cell merged back to parent"\)/)
  assert.match(undivideBlock, /setSelectedCellId\(null\)/)
})

// ============================================================
// globals.css has no tooltip CSS
// ============================================================

test("globals.css has no leaflet tooltip bridge CSS", () => {
  const cssSource = fs.readFileSync("src/app/globals.css", "utf8")
  assert.doesNotMatch(cssSource, /leaflet-tooltip/)
  assert.doesNotMatch(cssSource, /tooltip.*bridge/i)
})
