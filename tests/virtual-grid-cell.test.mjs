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

test("VirtualGridCellProps has onActivateCell prop", () => {
  assert.match(source, /onActivateCell:\s*\(cell:\s*VirtualCell\)\s*=>\s*Promise<string>/)
})

test("VirtualGridCellProps has onCellSelect prop", () => {
  assert.match(source, /onCellSelect:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
})

test("VirtualGridCell function is defined and not exported", () => {
  assert.match(source, /function\s+VirtualGridCell\s*\(/)
  assert.doesNotMatch(source, /export\s+function\s+VirtualGridCell/)
})

test("VirtualGridCell destructures cell, onActivateCell, onCellSelect", () => {
  assert.match(source, /VirtualGridCell\(\{\s*cell,\s*onActivateCell,\s*onCellSelect\s*\}/)
})

test("VirtualGridCell uses useState for activating state", () => {
  // Verify activating state is declared via useState
  assert.match(source, /const\s+\[activating,\s*setActivating\]\s*=\s*useState\(false\)/)
})

test("VirtualGridCell computes bounds from virtual cell coordinates", () => {
  // The VirtualGridCell section should reference cell.swLat, cell.swLng, cell.neLat, cell.neLng
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /cell\.swLat/)
  assert.match(virtualCellSection, /cell\.swLng/)
  assert.match(virtualCellSection, /cell\.neLat/)
  assert.match(virtualCellSection, /cell\.neLng/)
})

test("VirtualGridCell renders Rectangle with VIRTUAL_CELL_STYLE pathOptions", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /<Rectangle/)
  assert.match(virtualCellSection, /pathOptions=\{VIRTUAL_CELL_STYLE\}/)
})

test("VirtualGridCell has async click handler", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /async\s*\(\)/)
  assert.match(virtualCellSection, /eventHandlers=\{\{/)
  assert.match(virtualCellSection, /click:\s*handleClick/)
})

test("click handler guards against double-click with activating state", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /if\s*\(activating\)\s*return/)
  assert.match(virtualCellSection, /setActivating\(true\)/)
})

test("click handler calls onActivateCell then onCellSelect with returned ID", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /await\s+onActivateCell\(cell\)/)
  assert.match(virtualCellSection, /onCellSelect\(cellId\)/)
})

test("click handler resets activating in finally block", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /finally\s*\{/)
  assert.match(virtualCellSection, /setActivating\(false\)/)
})

test("VirtualGridCell Rectangle receives bounds prop", () => {
  const virtualCellSection = source.split("function VirtualGridCell")[1].split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /bounds=\{bounds\}/)
})
