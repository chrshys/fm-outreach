import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")
const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const gridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")
const cellColorsSource = fs.readFileSync("src/components/map/cell-colors.ts", "utf8")

// =============================================================================
// 1. Discovery Panel renders and integrates correctly
// =============================================================================

test("DiscoveryPanel is rendered only in discovery viewMode", () => {
  // MapFilters shown in clusters mode, DiscoveryPanel in discovery mode
  assert.match(pageSource, /viewMode\s*===\s*"clusters"\s*\?\s*\([\s\S]*?<MapFilters/)
  assert.match(pageSource, /<DiscoveryPanel\s+mapBounds/)
})

test("DiscoveryPanel receives all three required props from map page", () => {
  assert.match(pageSource, /mapBounds=\{mapBounds\}/)
  assert.match(pageSource, /selectedGridId=\{selectedGridId\}/)
  assert.match(pageSource, /onGridSelect=\{setSelectedGridId\}/)
})

test("panel defaults to open state", () => {
  assert.match(panelSource, /useState\(true\)/)
})

test("collapsed state shows Discovery button with Search icon", () => {
  assert.match(panelSource, /<Search\s+className/)
  assert.match(panelSource, /Discovery/)
  assert.match(panelSource, /onClick=\{\(\)\s*=>\s*setOpen\(true\)\}/)
})

test("panel close button sets open to false", () => {
  assert.match(panelSource, /onClick=\{\(\)\s*=>\s*setOpen\(false\)\}/)
  assert.match(panelSource, /aria-label="Close discovery panel"/)
})

// =============================================================================
// 2. Grid Selector integration
// =============================================================================

test("grid selector only renders when grids exist", () => {
  assert.match(panelSource, /grids && grids\.length > 0/)
})

test("selecting a grid calls onGridSelect and closes selector", () => {
  assert.match(panelSource, /onGridSelect\(grid\._id\)/)
  assert.match(panelSource, /setShowGridSelector\(false\)/)
})

test("New Grid option opens the grid form and closes selector", () => {
  assert.match(panelSource, /setShowNewGridForm\(true\)/)
  assert.match(panelSource, /setShowGridSelector\(false\)/)
})

test("auto-selects first grid when none selected", () => {
  assert.match(panelSource, /!selectedGridId\s*&&\s*grids\s*&&\s*grids\.length\s*>\s*0/)
  assert.match(panelSource, /onGridSelect\(grids\[0\]\._id\)/)
})

// =============================================================================
// 3. New Grid Form integration with mapBounds
// =============================================================================

test("grid form shows when no grids or user requests it", () => {
  assert.match(panelSource, /showNewGridForm\s*\|\|\s*!grids\s*\|\|\s*grids\.length\s*===\s*0/)
})

test("Create Grid button disabled without all fields", () => {
  assert.match(panelSource, /disabled=\{!gridName\.trim\(\)\s*\|\|\s*!region\.trim\(\)\s*\|\|\s*!province\.trim\(\)\s*\|\|\s*!mapBounds\}/)
})

test("handleCreateGrid passes map bounds to generateGrid mutation", () => {
  assert.match(panelSource, /swLat:\s*mapBounds\.swLat/)
  assert.match(panelSource, /swLng:\s*mapBounds\.swLng/)
  assert.match(panelSource, /neLat:\s*mapBounds\.neLat/)
  assert.match(panelSource, /neLng:\s*mapBounds\.neLng/)
})

test("handleCreateGrid resets form state on success", () => {
  assert.match(panelSource, /setShowNewGridForm\(false\)/)
  assert.match(panelSource, /setGridName\(""\)/)
  assert.match(panelSource, /setRegion\(""\)/)
  assert.match(panelSource, /setProvince\(""\)/)
})

test("handleCreateGrid selects newly created grid", () => {
  assert.match(panelSource, /onGridSelect\(result\.gridId/)
})

// =============================================================================
// 4. Grid Stats — frontend display matches backend computation
// =============================================================================

test("listGrids counts leaf cells by status using by_gridId_isLeaf index", () => {
  assert.match(gridCellsSource, /by_gridId_isLeaf/)
  assert.match(gridCellsSource, /isLeaf.*true/)
})

test("listGrids returns totalLeafCells as leafCells.length", () => {
  assert.match(gridCellsSource, /totalLeafCells:\s*leafCells\.length/)
})

test("listGrids returns searchedCount, saturatedCount, and searchingCount", () => {
  const returnMatch = gridCellsSource.match(/return\s*\{[\s\S]*?searchedCount[\s\S]*?saturatedCount[\s\S]*?searchingCount[\s\S]*?\}/)
  assert.ok(returnMatch, "listGrids return object should include all three count fields")
})

test("GridWithStats type matches listGrids return shape", () => {
  // All fields returned by listGrids must be in GridWithStats
  assert.match(panelSource, /name:\s*string/)
  assert.match(panelSource, /region:\s*string/)
  assert.match(panelSource, /province:\s*string/)
  assert.match(panelSource, /queries:\s*string\[\]/)
  assert.match(panelSource, /cellSizeKm:\s*number/)
  assert.match(panelSource, /totalLeadsFound:\s*number/)
  assert.match(panelSource, /totalLeafCells:\s*number/)
  assert.match(panelSource, /searchedCount:\s*number/)
  assert.match(panelSource, /saturatedCount:\s*number/)
  assert.match(panelSource, /searchingCount:\s*number/)
})

test("searched display adds searchedCount + saturatedCount", () => {
  assert.match(panelSource, /selectedGrid\.searchedCount\s*\+\s*selectedGrid\.saturatedCount/)
})

test("progress bar width formula is (searchedCount + saturatedCount) / totalLeafCells * 100", () => {
  assert.match(
    panelSource,
    /\(selectedGrid\.searchedCount\s*\+\s*selectedGrid\.saturatedCount\)\s*\/\s*selectedGrid\.totalLeafCells\)\s*\*\s*100/,
  )
})

test("progress bar only renders when totalLeafCells > 0 to avoid division by zero", () => {
  assert.match(panelSource, /selectedGrid\.totalLeafCells\s*>\s*0/)
})

test("searching count conditionally displayed when > 0", () => {
  assert.match(panelSource, /selectedGrid\.searchingCount\s*>\s*0/)
})

test("saturated count displayed with orange text", () => {
  assert.match(panelSource, /text-orange-500[\s\S]*?selectedGrid\.saturatedCount/)
})

test("leads found displayed with green text", () => {
  assert.match(panelSource, /text-green-500[\s\S]*?selectedGrid\.totalLeadsFound/)
})

test("searching count displayed with blue text", () => {
  assert.match(panelSource, /text-blue-500[\s\S]*?selectedGrid\.searchingCount/)
})

// =============================================================================
// 5. Query editing — full lifecycle
// =============================================================================

test("query edit lifecycle: click text -> input -> save/cancel", () => {
  // Click text -> sets editingQuery and editValue
  assert.match(panelSource, /handleStartEdit/)
  assert.match(panelSource, /setEditingQuery\(query\)/)
  assert.match(panelSource, /setEditValue\(query\)/)

  // Conditional render: input vs text
  assert.match(panelSource, /editingQuery\s*===\s*query\s*\?/)

  // Save and cancel handlers exist
  assert.match(panelSource, /handleSaveEdit/)
  assert.match(panelSource, /handleCancelEdit/)
})

test("edit input bound to editValue state", () => {
  assert.match(panelSource, /value=\{editValue\}/)
  assert.match(panelSource, /setEditValue\(e\.target\.value\)/)
})

test("edit input keyboard shortcuts: Enter saves, Escape cancels", () => {
  assert.match(panelSource, /e\.key\s*===\s*"Enter"/)
  assert.match(panelSource, /e\.key\s*===\s*"Escape"/)
})

test("edit input saves on blur for better UX", () => {
  assert.match(panelSource, /onBlur=\{handleSaveEdit\}/)
})

test("edit save replaces old query in array, keeping order", () => {
  assert.match(panelSource, /selectedGrid\.queries\.map\(\(q\)\s*=>\s*q\s*===\s*editingQuery\s*\?\s*trimmed\s*:\s*q\)/)
})

test("edit prevents renaming to existing query", () => {
  // handleSaveEdit checks for duplicates
  assert.match(panelSource, /selectedGrid\.queries\.includes\(trimmed\)/)
})

test("edit skips save when value unchanged", () => {
  assert.match(panelSource, /trimmed\s*===\s*editingQuery/)
})

test("add query prevents duplicates", () => {
  // handleAddQuery checks includes
  assert.match(panelSource, /selectedGrid\.queries\.includes\(trimmed\)/)
  assert.match(panelSource, /Query already exists/)
})

test("add query clears input on success", () => {
  assert.match(panelSource, /setNewQuery\(""\)/)
})

test("add query button disabled when input empty", () => {
  assert.match(panelSource, /disabled=\{!newQuery\.trim\(\)\}/)
})

test("remove query filters by exact match", () => {
  assert.match(panelSource, /selectedGrid\.queries\.filter\(\(q\)\s*=>\s*q\s*!==\s*queryToRemove\)/)
})

// =============================================================================
// 6. Backend query persistence
// =============================================================================

test("updateGridQueries validates grid exists before patching", () => {
  assert.match(gridCellsSource, /const\s+grid\s*=\s*await\s+ctx\.db\.get\(args\.gridId\)/)
  assert.match(gridCellsSource, /throw\s+new\s+ConvexError\("Grid not found"\)/)
})

test("updateGridQueries patches only the queries field", () => {
  assert.match(gridCellsSource, /ctx\.db\.patch\(args\.gridId,\s*\{\s*queries:\s*args\.queries\s*\}\)/)
})

// =============================================================================
// 7. Cell colors consistency — legend matches grid cell rendering
// =============================================================================

test("cell-colors.ts defines all four status types", () => {
  assert.match(cellColorsSource, /unsearched/)
  assert.match(cellColorsSource, /searching/)
  assert.match(cellColorsSource, /searched/)
  assert.match(cellColorsSource, /saturated/)
})

test("panel legend colors match cell-colors.ts color values", () => {
  // Extract colors from CELL_COLORS
  const unsearchedColor = cellColorsSource.match(/unsearched:\s*\{[^}]*color:\s*"(#[a-f0-9]+)"/)?.[1]
  const searchingColor = cellColorsSource.match(/searching:\s*\{[^}]*color:\s*"(#[a-f0-9]+)"/)?.[1]
  const searchedColor = cellColorsSource.match(/searched:\s*\{[^}]*color:\s*"(#[a-f0-9]+)"/)?.[1]
  const saturatedColor = cellColorsSource.match(/saturated:\s*\{[^}]*color:\s*"(#[a-f0-9]+)"/)?.[1]

  assert.ok(unsearchedColor)
  assert.ok(searchingColor)
  assert.ok(searchedColor)
  assert.ok(saturatedColor)

  // Legend should use same colors
  assert.match(panelSource, new RegExp(unsearchedColor.replace("#", "#")))
  assert.match(panelSource, new RegExp(searchingColor.replace("#", "#")))
  assert.match(panelSource, new RegExp(searchedColor.replace("#", "#")))
  assert.match(panelSource, new RegExp(saturatedColor.replace("#", "#")))
})

test("getCellColor returns a default for unknown status", () => {
  assert.match(cellColorsSource, /DEFAULT_CELL_COLOR/)
  assert.match(cellColorsSource, /\?\?\s*DEFAULT_CELL_COLOR/)
})

// =============================================================================
// 8. Discovery grid renders cells correctly
// =============================================================================

test("DiscoveryGrid maps cells to individual cell components", () => {
  assert.match(gridSource, /cells\.map\(\(cell\)/)
  assert.match(gridSource, /key=\{cell\._id\}/)
})

test("each cell gets pathOptions from getCellColor with its status", () => {
  assert.match(gridSource, /getCellColor\(cell\.status\)/)
  assert.match(gridSource, /pathOptions=\{/)
})

test("cell bounds calculated from sw/ne coordinates", () => {
  assert.match(gridSource, /\[cell\.swLat,\s*cell\.swLng\]/)
  assert.match(gridSource, /\[cell\.neLat,\s*cell\.neLng\]/)
})

// =============================================================================
// 9. View mode toggle works correctly
// =============================================================================

test("view mode toggle cycles between clusters and discovery", () => {
  assert.match(pageSource, /setViewMode\(\(prev\)\s*=>\s*prev\s*===\s*"clusters"\s*\?\s*"discovery"\s*:\s*"clusters"\)/)
})

test("toggle resets drawing state when switching modes", () => {
  assert.match(pageSource, /setIsDrawing\(false\)/)
  assert.match(pageSource, /setShowNamingDialog\(false\)/)
  assert.match(pageSource, /setDrawnPolygon\(null\)/)
})

test("grid cells query skips when not in discovery mode", () => {
  assert.match(pageSource, /selectedGridId\s*&&\s*viewMode\s*===\s*"discovery"/)
  assert.match(pageSource, /:\s*"skip"/)
})

test("onCellAction only passed in discovery mode", () => {
  assert.match(pageSource, /onCellAction=\{viewMode\s*===\s*"discovery"\s*\?\s*handleCellAction\s*:\s*undefined\}/)
})

// =============================================================================
// 10. listCells returns correct shape for grid rendering
// =============================================================================

test("listCells returns all fields needed by CellData type", () => {
  const listCellsBlock = gridCellsSource.match(
    /export\s+const\s+listCells\s*=\s*query\(\{([\s\S]*?)\}\);/,
  )
  assert.ok(listCellsBlock, "listCells query should exist")
  const body = listCellsBlock[1]

  // All fields that CellData needs
  assert.match(body, /cell\._id/)
  assert.match(body, /cell\.swLat/)
  assert.match(body, /cell\.swLng/)
  assert.match(body, /cell\.neLat/)
  assert.match(body, /cell\.neLng/)
  assert.match(body, /cell\.depth/)
  assert.match(body, /cell\.status/)
  assert.match(body, /cell\.resultCount/)
  assert.match(body, /cell\.querySaturation/)
  assert.match(body, /cell\.lastSearchedAt/)
})

test("listCells filters to leaf cells only", () => {
  assert.match(gridCellsSource, /by_gridId_isLeaf[\s\S]*?eq\("isLeaf",\s*true\)/)
})
