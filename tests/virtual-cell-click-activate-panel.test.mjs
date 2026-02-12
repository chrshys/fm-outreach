import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const cellColorsSource = fs.readFileSync(
  "src/components/map/cell-colors.ts",
  "utf8",
)
const sharedSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)

// ============================================================
// Virtual cell click → simple toggle selection
// ============================================================

test("VirtualGridCell toggles pathOptions between selected and unselected styles", () => {
  const virtualSection = gridSource
    .split("function VirtualGridCell")[1]
    .split("function DiscoveryGridCell")[0]

  assert.match(virtualSection, /isSelected\s*\?\s*VIRTUAL_CELL_SELECTED_STYLE\s*:\s*VIRTUAL_CELL_STYLE/)
})

test("VIRTUAL_CELL_STYLE uses gray color with low opacity and thin weight", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_STYLE/)
  assert.match(cellColorsSource, /fillOpacity:\s*0\.08/)
  assert.match(cellColorsSource, /weight:\s*1/)
})

test("VIRTUAL_CELL_SELECTED_STYLE uses blue border with dashed pattern", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_SELECTED_STYLE/)
  assert.match(cellColorsSource, /color:\s*"#2563eb"/)
  assert.match(cellColorsSource, /dashArray:\s*"6 4"/)
  assert.match(cellColorsSource, /weight:\s*3/)
})

test("VirtualGridCell click is a simple toggle (no async, no activating state)", () => {
  const virtualSection = gridSource
    .split("function VirtualGridCell")[1]
    .split("function DiscoveryGridCell")[0]

  assert.match(virtualSection, /onSelectVirtual\(isSelected\s*\?\s*null\s*:\s*cell\)/)
  assert.doesNotMatch(virtualSection, /async/)
  assert.doesNotMatch(virtualSection, /activating/)
  assert.doesNotMatch(virtualSection, /useState/)
})

// ============================================================
// Activated cell renders as unsearched gray with blue dashed selection border
// ============================================================

test("unsearched cell base color is gray #9ca3af", () => {
  assert.match(
    cellColorsSource,
    /unsearched:\s*\{\s*color:\s*"#9ca3af"/,
  )
})

test("selected cell gets dashed blue border (weight 3, dashArray '6 4', color #2563eb)", () => {
  const cellSection = gridSource
    .split("function DiscoveryGridCell")[1]
    .split("function getMapBounds")[0]

  assert.match(cellSection, /weight:\s*3/)
  assert.match(cellSection, /dashArray:\s*"6 4"/)
  assert.match(cellSection, /color:\s*"#2563eb"/)
})

test("selected cell fillOpacity increases by 0.1 over base", () => {
  const cellSection = gridSource
    .split("function DiscoveryGridCell")[1]
    .split("function getMapBounds")[0]

  assert.match(
    cellSection,
    /fillOpacity:\s*\(basePathOptions\.fillOpacity\s*\?\?\s*0\.15\)\s*\+\s*0\.1/,
  )
})

// ============================================================
// Panel shows cell details when cell is selected
// ============================================================

test("panel renders 'Selected Cell' section only when selectedCell exists", () => {
  assert.match(panelSource, /\{selectedCell\s*&&/)
  assert.match(panelSource, /Selected Cell/)
})

test("panel shows status badge using getStatusBadgeColor", () => {
  assert.match(panelSource, /getStatusBadgeColor\(selectedCell\.status\)/)
  assert.match(panelSource, /\{selectedCell\.status\}/)
})

test("panel shows depth indicator as d{depth}", () => {
  assert.match(panelSource, /d\{selectedCell\.depth\}/)
})

test("panel shows discovery mechanism Run buttons", () => {
  assert.match(panelSource, /DISCOVERY_MECHANISMS\.map/)
  assert.match(panelSource, /<Play/)
  assert.match(panelSource, /Run/)
})

test("panel shows Split button with Grid2x2Plus icon", () => {
  assert.match(panelSource, /<Grid2x2Plus/)
  assert.match(panelSource, /Split/)
})

test("getStatusBadgeColor returns gray for unsearched status", () => {
  assert.match(sharedSource, /case\s*"unsearched":\s*return\s*"bg-gray-200\s+text-gray-700"/)
})

// ============================================================
// Page wiring: virtual cell selection
// ============================================================

test("page passes cells and selectedCellId to DiscoveryPanel", () => {
  assert.match(pageSource, /<DiscoveryPanel[\s\S]*?cells=\{cells\s*\?\?\s*\[\]\}/)
  assert.match(pageSource, /<DiscoveryPanel[\s\S]*?selectedCellId=\{selectedCellId\}/)
})

test("page handleCellSelect sets selectedCellId state", () => {
  assert.match(pageSource, /const\s+handleCellSelect\s*=\s*useCallback\(\(cellId/)
  assert.match(pageSource, /setSelectedCellId\(cellId\)/)
})

// ============================================================
// Behavioral: activated virtual cell is excluded from virtual grid rendering
// ============================================================

test("full flow: activated virtual cell is excluded from virtual grid rendering", () => {
  assert.match(gridSource, /activatedSet\.has\(vc\.key\)/)
  assert.match(gridSource, /persistedBoundsKeySet\.has\(vc\.key\)/)
  assert.match(gridSource, /filteredVirtualCells\.map/)
})
