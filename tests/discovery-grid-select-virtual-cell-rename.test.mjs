import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")
const mapContentSource = fs.readFileSync("src/components/map/map-content.tsx", "utf8")
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// DiscoveryGridProps uses onSelectVirtualCell (not onSelectVirtual)
// ============================================================

test("DiscoveryGridProps has onSelectVirtualCell prop", () => {
  const match = gridSource.match(/type DiscoveryGridProps\s*=\s*\{[^}]*\}/)
  assert.ok(match, "DiscoveryGridProps type should exist")
  assert.match(match[0], /onSelectVirtualCell:\s*\(cell:\s*VirtualCell\s*\|\s*null\)\s*=>\s*void/)
})

test("DiscoveryGridProps does not have onSelectVirtual (renamed to onSelectVirtualCell)", () => {
  const match = gridSource.match(/type DiscoveryGridProps\s*=\s*\{[^}]*\}/)
  assert.ok(match, "DiscoveryGridProps type should exist")
  assert.ok(!match[0].includes("onSelectVirtual:"), "should not contain onSelectVirtual: (use onSelectVirtualCell)")
})

test("DiscoveryGrid destructures onSelectVirtualCell from props", () => {
  assert.match(gridSource, /export default function DiscoveryGrid\(\{[^}]*onSelectVirtualCell[^}]*\}/)
})

// ============================================================
// DiscoveryGrid render passes isSelected={vc.key === selectedCellId}
// ============================================================

test("VirtualGridCell isSelected uses vc.key === selectedCellId", () => {
  assert.match(gridSource, /isSelected=\{vc\.key\s*===\s*selectedCellId\}/)
})

test("VirtualGridCell isSelected does NOT use selectedVirtualCell?.key", () => {
  assert.doesNotMatch(gridSource, /isSelected=\{selectedVirtualCell\?\.key/)
})

// ============================================================
// DiscoveryGrid render passes onSelectVirtual={onSelectVirtualCell}
// ============================================================

test("VirtualGridCell receives onSelectVirtual={onSelectVirtualCell}", () => {
  assert.match(gridSource, /onSelectVirtual=\{onSelectVirtualCell\}/)
})

// ============================================================
// VirtualGridCellProps still uses onSelectVirtual (internal API unchanged)
// ============================================================

test("VirtualGridCellProps still has onSelectVirtual (not renamed)", () => {
  const match = gridSource.match(/type VirtualGridCellProps\s*=\s*\{[^}]*\}/)
  assert.ok(match, "VirtualGridCellProps type should exist")
  assert.match(match[0], /onSelectVirtual:\s*\(cell:\s*VirtualCell\s*\|\s*null\)\s*=>\s*void/)
})

// ============================================================
// MapContentProps uses onSelectVirtualCell
// ============================================================

test("MapContentProps has onSelectVirtualCell prop", () => {
  assert.match(mapContentSource, /onSelectVirtualCell\?:\s*\(cell:\s*VirtualCell\s*\|\s*null\)\s*=>\s*void/)
})

test("MapContent passes onSelectVirtualCell to DiscoveryGrid", () => {
  assert.match(mapContentSource, /onSelectVirtualCell=\{onSelectVirtualCell/)
})

// ============================================================
// Page passes onSelectVirtualCell to MapContent
// ============================================================

test("Page passes onSelectVirtualCell to MapContent", () => {
  assert.match(pageSource, /onSelectVirtualCell=\{viewMode\s*===\s*"discovery"\s*\?\s*handleSelectVirtual\s*:\s*undefined\}/)
})
