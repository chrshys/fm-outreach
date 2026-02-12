import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

test("VirtualGridCellProps type has cell: VirtualCell", () => {
  assert.match(source, /type\s+VirtualGridCellProps\s*=\s*\{/)
  assert.match(source, /cell:\s*VirtualCell/)
})

test("VirtualGridCellProps has isSelected boolean prop", () => {
  const match = source.match(/type VirtualGridCellProps\s*=\s*\{[^}]*\}/)
  assert.ok(match, "VirtualGridCellProps type should exist")
  assert.ok(match[0].includes("isSelected: boolean"), "should have isSelected: boolean")
})

test("VirtualGridCellProps has onSelectVirtual prop", () => {
  const match = source.match(/type VirtualGridCellProps\s*=\s*\{[^}]*\}/)
  assert.ok(match, "VirtualGridCellProps type should exist")
  assert.match(match[0], /onSelectVirtual:\s*\(cell:\s*VirtualCell\s*\|\s*null\)\s*=>\s*void/)
})

test("VirtualGridCellProps does not have onActivateCell or onCellSelect", () => {
  const match = source.match(/type VirtualGridCellProps\s*=\s*\{[^}]*\}/)
  assert.ok(match, "VirtualGridCellProps type should exist")
  assert.ok(!match[0].includes("onActivateCell"), "should not contain onActivateCell")
  assert.ok(!match[0].includes("onCellSelect"), "should not contain onCellSelect")
})

test("VirtualGridCell function is defined and not exported", () => {
  assert.match(source, /function\s+VirtualGridCell\s*\(/)
  assert.doesNotMatch(source, /export\s+function\s+VirtualGridCell/)
})

test("VirtualGridCell destructures cell, isSelected, onSelectVirtual", () => {
  assert.match(source, /VirtualGridCell\(\{\s*cell,\s*isSelected,\s*onSelectVirtual\s*\}/)
})

test("VirtualGridCell does not use useState (no activating state)", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.doesNotMatch(virtualCellSection, /useState/)
})

test("VirtualGridCell computes bounds from virtual cell coordinates", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /cell\.swLat/)
  assert.match(virtualCellSection, /cell\.swLng/)
  assert.match(virtualCellSection, /cell\.neLat/)
  assert.match(virtualCellSection, /cell\.neLng/)
})

test("VirtualGridCell toggles pathOptions between selected and unselected styles", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /<Rectangle/)
  assert.match(virtualCellSection, /isSelected\s*\?\s*VIRTUAL_CELL_SELECTED_STYLE\s*:\s*VIRTUAL_CELL_STYLE/)
})

test("VirtualGridCell click handler is a simple toggle via onSelectVirtual", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /eventHandlers=\{\{/)
  assert.match(virtualCellSection, /click:\s*\(\)\s*=>\s*onSelectVirtual\(isSelected\s*\?\s*null\s*:\s*cell\)/)
})

test("VirtualGridCell does not have async click handler", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.doesNotMatch(virtualCellSection, /async/)
  assert.doesNotMatch(virtualCellSection, /handleClick/)
})

test("VirtualGridCell Rectangle receives bounds prop", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /bounds=\{bounds\}/)
})
