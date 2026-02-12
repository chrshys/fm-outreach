import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")

test("VirtualGridCellProps has isSelected boolean field", () => {
  assert.match(source, /type VirtualGridCellProps\s*=\s*\{[^}]*isSelected:\s*boolean/)
})

test("VirtualGridCellProps has onSelectVirtual callback", () => {
  assert.match(source, /type VirtualGridCellProps\s*=\s*\{[^}]*onSelectVirtual:\s*\(cell:\s*VirtualCell\s*\|\s*null\)\s*=>\s*void/)
})

test("VirtualGridCellProps does not have onActivateCell", () => {
  // Extract the VirtualGridCellProps type block
  const match = source.match(/type VirtualGridCellProps\s*=\s*\{[^}]*\}/)
  assert.ok(match, "VirtualGridCellProps type should exist")
  assert.ok(!match[0].includes("onActivateCell"), "VirtualGridCellProps should not contain onActivateCell")
})

test("VirtualGridCellProps does not have onCellSelect", () => {
  const match = source.match(/type VirtualGridCellProps\s*=\s*\{[^}]*\}/)
  assert.ok(match, "VirtualGridCellProps type should exist")
  assert.ok(!match[0].includes("onCellSelect"), "VirtualGridCellProps should not contain onCellSelect")
})

test("VirtualGridCell uses isSelected to pick path options", () => {
  assert.match(source, /isSelected\s*\?\s*VIRTUAL_CELL_SELECTED_STYLE\s*:\s*VIRTUAL_CELL_STYLE/)
})

test("VirtualGridCell click handler calls onSelectVirtual", () => {
  assert.match(source, /onSelectVirtual\(isSelected\s*\?\s*null\s*:\s*cell\)/)
})

test("DiscoveryGridProps has selectedVirtualCell field", () => {
  assert.match(source, /type DiscoveryGridProps\s*=\s*\{[^}]*selectedVirtualCell:\s*VirtualCell\s*\|\s*null/)
})

test("DiscoveryGridProps has onSelectVirtualCell callback", () => {
  assert.match(source, /type DiscoveryGridProps\s*=\s*\{[^}]*onSelectVirtualCell:\s*\(cell:\s*VirtualCell\s*\|\s*null\)\s*=>\s*void/)
})

test("DiscoveryGridProps does not have onActivateCell", () => {
  const match = source.match(/type DiscoveryGridProps\s*=\s*\{[^}]*\}/)
  assert.ok(match, "DiscoveryGridProps type should exist")
  assert.ok(!match[0].includes("onActivateCell"), "DiscoveryGridProps should not contain onActivateCell")
})

test("DiscoveryGrid passes isSelected to VirtualGridCell via selectedVirtualCell", () => {
  assert.match(source, /isSelected=\{vc\.key\s*===\s*selectedVirtualCell\?\.key\}/)
})

test("DiscoveryGrid passes onSelectVirtual to VirtualGridCell from onSelectVirtualCell", () => {
  assert.match(source, /<VirtualGridCell[\s\S]*?onSelectVirtual=\{onSelectVirtualCell\}/)
})
