import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// Virtual cell selection is purely client-side (no network/DB)
// ============================================================

test("DiscoveryGrid destructures selectedVirtualCell from props", () => {
  assert.match(gridSource, /export default function DiscoveryGrid\(\{[^}]*selectedVirtualCell[^}]*\}/)
})

test("VirtualGridCell isSelected compares against selectedVirtualCell key, not selectedCellId", () => {
  assert.match(gridSource, /isSelected=\{vc\.key\s*===\s*selectedVirtualCell\?\.key\}/)
  assert.doesNotMatch(gridSource, /isSelected=\{vc\.key\s*===\s*selectedCellId\}/)
})

test("VirtualGridCell click handler does not call any mutation or async function", () => {
  const virtualCellSection = gridSource.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.doesNotMatch(virtualCellSection, /useMutation/)
  assert.doesNotMatch(virtualCellSection, /await\s/)
  assert.doesNotMatch(virtualCellSection, /async/)
})

test("VirtualGridCell uses VIRTUAL_CELL_SELECTED_STYLE with blue dashed border", () => {
  const colorsSource = fs.readFileSync("src/components/map/cell-colors.ts", "utf8")
  assert.match(colorsSource, /VIRTUAL_CELL_SELECTED_STYLE/)
  // Blue color
  assert.match(colorsSource, /#2563eb/)
  // Dashed border
  assert.match(colorsSource, /dashArray:\s*"6 4"/)
})

test("handleSelectVirtualCell in page sets selectedVirtualCell and selectedCellId to cell.key", () => {
  assert.match(pageSource, /setSelectedVirtualCell\(cell\)/)
  assert.match(pageSource, /setSelectedCellId\(cell\s*\?\s*cell\.key\s*:\s*null\)/)
})

test("handleCellSelect in page clears selectedVirtualCell when selecting persisted cell", () => {
  assert.match(pageSource, /setSelectedCellId\(cellId\)/)
  assert.match(pageSource, /setSelectedVirtualCell\(null\)/)
})
