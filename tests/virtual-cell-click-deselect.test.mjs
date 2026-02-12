import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// Clicking the same virtual cell again deselects it
// ============================================================

// --- VirtualGridCell toggle logic ---

test("VirtualGridCell click handler is a ternary toggling between null and cell", () => {
  const virtualFn = gridSource.slice(
    gridSource.indexOf("function VirtualGridCell"),
    gridSource.indexOf("function DiscoveryGridCell"),
  )
  // When isSelected is true the handler passes null (deselect),
  // otherwise it passes the cell object (select)
  assert.match(
    virtualFn,
    /click:\s*\(\)\s*=>\s*onSelectVirtual\(isSelected\s*\?\s*null\s*:\s*cell\)/,
  )
})

test("VirtualGridCell derives isSelected from props (not internal state)", () => {
  const virtualFn = gridSource.slice(
    gridSource.indexOf("function VirtualGridCell"),
    gridSource.indexOf("function DiscoveryGridCell"),
  )
  assert.match(gridSource, /\{\s*cell,\s*isSelected,\s*onSelectVirtual\s*\}/)
  assert.doesNotMatch(virtualFn, /useState/)
})

test("VirtualGridCell uses default style when not selected", () => {
  const virtualFn = gridSource.slice(
    gridSource.indexOf("function VirtualGridCell"),
    gridSource.indexOf("function DiscoveryGridCell"),
  )
  assert.match(
    virtualFn,
    /isSelected\s*\?\s*VIRTUAL_CELL_SELECTED_STYLE\s*:\s*VIRTUAL_CELL_STYLE/,
  )
})

// --- Page wiring: handleSelectVirtual accepts null ---

test("handleSelectVirtual parameter type allows null (cell: VirtualCell | null)", () => {
  assert.match(
    pageSource,
    /handleSelectVirtual\s*=\s*useCallback\(\(cell:\s*VirtualCell\s*\|\s*null\)/,
  )
})

test("handleSelectVirtual calls setSelectedVirtualCell with the received value", () => {
  const fnMatch = pageSource.match(
    /handleSelectVirtual\s*=\s*useCallback\([\s\S]*?\),\s*\[/,
  )
  assert.ok(fnMatch, "handleSelectVirtual not found")
  assert.match(fnMatch[0], /setSelectedVirtualCell\(cell\)/)
})

test("handleSelectVirtual clears selectedCellId when selecting or deselecting a virtual cell", () => {
  const fnMatch = pageSource.match(
    /handleSelectVirtual\s*=\s*useCallback\([\s\S]*?\),\s*\[/,
  )
  assert.ok(fnMatch, "handleSelectVirtual not found")
  assert.match(fnMatch[0], /setSelectedCellId\(null\)/)
})

// --- DiscoveryGrid passes isSelected based on selectedVirtualCell ---

test("DiscoveryGrid computes VirtualGridCell isSelected from selectedVirtualCell key", () => {
  assert.match(gridSource, /isSelected=\{vc\.key\s*===\s*selectedVirtualCell\?\.key\}/)
})

// --- useEffect resets virtual selection when grid changes ---

test("selectedVirtualCell resets to null when globalGridId changes", () => {
  assert.match(
    pageSource,
    /useEffect\(\(\)\s*=>\s*\{[^}]*setSelectedVirtualCell\(null\)[^}]*\},\s*\[globalGridId\]\)/,
  )
})
