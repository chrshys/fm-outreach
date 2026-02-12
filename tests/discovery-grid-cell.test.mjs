import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// DiscoveryGridCell component existence and export
// ============================================================

test("DiscoveryGridCell is a file-private function (not exported)", () => {
  assert.doesNotMatch(source, /export\s+function\s+DiscoveryGridCell/)
  assert.match(source, /function\s+DiscoveryGridCell/)
})

// ============================================================
// DiscoveryGridCell props
// ============================================================

test("DiscoveryGridCell accepts cell: CellData prop", () => {
  assert.match(source, /cell:\s*CellData/)
})

test("DiscoveryGridCell accepts isSelected: boolean prop", () => {
  assert.match(source, /isSelected:\s*boolean/)
})

test("DiscoveryGridCell accepts onCellSelect: (cellId: string | null) => void prop", () => {
  assert.match(source, /onCellSelect:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
})

// ============================================================
// DiscoveryGridCell renders a Rectangle
// ============================================================

test("DiscoveryGridCell renders a Rectangle element", () => {
  // Extract the DiscoveryGridCell function body
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch, "DiscoveryGridCell function not found")
  assert.match(cellFnMatch[0], /<Rectangle/)
})

test("DiscoveryGridCell computes bounds from cell coordinates", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch, "DiscoveryGridCell function not found")
  assert.match(cellFnMatch[0], /\[cell\.swLat,\s*cell\.swLng\]/)
  assert.match(cellFnMatch[0], /\[cell\.neLat,\s*cell\.neLng\]/)
})

// ============================================================
// DiscoveryGridCell styling — base uses getCellColor
// ============================================================

test("DiscoveryGridCell calls getCellColor(cell.status) for base path options", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.match(cellFnMatch[0], /getCellColor\(cell\.status\)/)
})

// ============================================================
// DiscoveryGridCell styling — selected override
// ============================================================

test("selected cell has weight: 3", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.match(cellFnMatch[0], /weight:\s*3/)
})

test("selected cell has dashArray: \"6 4\"", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.match(cellFnMatch[0], /dashArray:\s*"6 4"/)
})

test("selected cell has color: \"#2563eb\"", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.match(cellFnMatch[0], /color:\s*"#2563eb"/)
})

test("selected cell increases fillOpacity by 0.1 with fallback of 0.15", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.match(cellFnMatch[0], /fillOpacity:\s*\(basePathOptions\.fillOpacity\s*\?\?\s*0\.15\)\s*\+\s*0\.1/)
})

// ============================================================
// DiscoveryGridCell click handler — toggle selection
// ============================================================

test("DiscoveryGridCell click handler calls onCellSelect with toggle logic", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.match(cellFnMatch[0], /onCellSelect\(isSelected\s*\?\s*null\s*:\s*cell\._id\)/)
})

test("DiscoveryGridCell has click eventHandler", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.match(cellFnMatch[0], /eventHandlers/)
  assert.match(cellFnMatch[0], /click:/)
})

// ============================================================
// DiscoveryGridCell has NO tooltip, hover, refs, or timers
// ============================================================

test("DiscoveryGridCell does not use Tooltip", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.doesNotMatch(cellFnMatch[0], /Tooltip/)
})

test("DiscoveryGridCell does not have hover handlers", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.doesNotMatch(cellFnMatch[0], /mouseover|mouseout|mouseenter|mouseleave/i)
})

test("DiscoveryGridCell does not use refs", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.doesNotMatch(cellFnMatch[0], /useRef|ref=/)
})

test("DiscoveryGridCell does not use timers", () => {
  const cellFnMatch = source.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch)
  assert.doesNotMatch(cellFnMatch[0], /setTimeout|setInterval|clearTimeout|clearInterval/)
})

// ============================================================
// DiscoveryGrid uses DiscoveryGridCell
// ============================================================

test("DiscoveryGrid renders DiscoveryGridCell for each cell", () => {
  const gridFnMatch = source.match(/export\s+default\s+function\s+DiscoveryGrid[\s\S]*$/)
  assert.ok(gridFnMatch)
  assert.match(gridFnMatch[0], /<DiscoveryGridCell/)
})

test("DiscoveryGrid passes isSelected computed from selectedCellId", () => {
  const gridFnMatch = source.match(/export\s+default\s+function\s+DiscoveryGrid[\s\S]*$/)
  assert.ok(gridFnMatch)
  assert.match(gridFnMatch[0], /isSelected=\{cell\._id\s*===\s*selectedCellId\}/)
})
