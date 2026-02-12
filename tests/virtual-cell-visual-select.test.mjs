import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const colorsSource = fs.readFileSync("src/components/map/cell-colors.ts", "utf8")
const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// ============================================================
// Clicking a virtual cell selects it visually without DB writes
// ============================================================

// --- Click handler is synchronous and mutation-free ---

test("VirtualGridCell click handler contains no await or async", () => {
  const virtualFn = gridSource.slice(
    gridSource.indexOf("function VirtualGridCell"),
    gridSource.indexOf("function DiscoveryGridCell"),
  )
  assert.doesNotMatch(virtualFn, /await\s/)
  assert.doesNotMatch(virtualFn, /async/)
})

test("VirtualGridCell click handler contains no useMutation", () => {
  const virtualFn = gridSource.slice(
    gridSource.indexOf("function VirtualGridCell"),
    gridSource.indexOf("function DiscoveryGridCell"),
  )
  assert.doesNotMatch(virtualFn, /useMutation/)
})

test("handleSelectVirtualCell body contains no mutation calls or awaits", () => {
  // Extract just the callback body (up to the closing }, [])
  const fnMatch = pageSource.match(
    /handleSelectVirtualCell\s*=\s*useCallback\(\(cell:\s*VirtualCell\s*\|\s*null\)\s*=>\s*\{([\s\S]*?)\},\s*\[\]/,
  )
  assert.ok(fnMatch, "handleSelectVirtualCell should exist")
  const body = fnMatch[1]
  assert.doesNotMatch(body, /await\s/)
  assert.doesNotMatch(body, /Mutation/)
  assert.doesNotMatch(body, /activateCell/)
})

// --- Visual selection styling ---

test("selected virtual cell gets distinct visual style (blue border, dashed)", () => {
  assert.match(colorsSource, /VIRTUAL_CELL_SELECTED_STYLE/)
  assert.match(colorsSource, /color:\s*"#2563eb"/)
  assert.match(colorsSource, /dashArray:\s*"6 4"/)
  assert.match(colorsSource, /weight:\s*3/)
})

test("unselected virtual cell uses lighter default style", () => {
  assert.match(colorsSource, /VIRTUAL_CELL_STYLE/)
  // Default should use gray and lower opacity than selected
  const defaultMatch = colorsSource.match(/VIRTUAL_CELL_STYLE\s*=\s*\{([^}]+)\}/)
  assert.ok(defaultMatch, "VIRTUAL_CELL_STYLE should be defined")
  assert.match(defaultMatch[1], /fillOpacity:\s*0\.08/)
  assert.match(defaultMatch[1], /weight:\s*1/)
})

test("VirtualGridCell toggles between VIRTUAL_CELL_STYLE and VIRTUAL_CELL_SELECTED_STYLE", () => {
  const virtualFn = gridSource.slice(
    gridSource.indexOf("function VirtualGridCell"),
    gridSource.indexOf("function DiscoveryGridCell"),
  )
  assert.match(virtualFn, /isSelected\s*\?\s*VIRTUAL_CELL_SELECTED_STYLE\s*:\s*VIRTUAL_CELL_STYLE/)
})

// --- State management: selection is client-only ---

test("page uses useState for selectedVirtualCell (not a DB query)", () => {
  assert.match(pageSource, /useState<VirtualCell\s*\|\s*null>\(null\)/)
})

test("handleSelectVirtualCell only calls two setters (no side effects)", () => {
  const fnMatch = pageSource.match(
    /handleSelectVirtualCell\s*=\s*useCallback\(\(cell:\s*VirtualCell\s*\|\s*null\)\s*=>\s*\{([\s\S]*?)\},\s*\[\]/,
  )
  assert.ok(fnMatch)
  const body = fnMatch[1]
  const setterCalls = body.match(/set\w+\(/g)
  assert.ok(setterCalls, "should have setter calls")
  assert.equal(setterCalls.length, 2, "should call exactly two setters: setSelectedVirtualCell and setSelectedCellId")
})

// --- Panel displays virtual cell info without DB lookup ---

test("DiscoveryPanel shows virtual cell section without querying for cell data", () => {
  // The virtual cell section condition checks !selectedCell (no DB lookup for virtual cells)
  assert.match(panelSource, /!selectedCell\s*&&\s*selectedVirtualCell/)
})

test("virtual cell section does not reference _id (no database identity)", () => {
  const virtualSection = panelSource.slice(
    panelSource.indexOf("Selected Virtual Cell"),
    panelSource.indexOf("Selected Cell */"),
  )
  // The virtual cell section should not use _id - it uses .key instead
  assert.doesNotMatch(virtualSection, /selectedVirtualCell\._id/)
})

// --- Mutual exclusivity: selecting persisted cell clears virtual ---

test("handleCellSelect clears virtual selection to prevent dual selection", () => {
  const fnMatch = pageSource.match(
    /handleCellSelect\s*=\s*useCallback\(([\s\S]*?)\),\s*\[/,
  )
  assert.ok(fnMatch)
  assert.match(fnMatch[1], /setSelectedVirtualCell\(null\)/)
})
