import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const mapContentSource = fs.readFileSync(
  "src/components/map/map-content.tsx",
  "utf8",
)
const mapPageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const discoveryGridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

test("gridCells prop is optional in MapContentProps", () => {
  assert.match(mapContentSource, /gridCells\?:\s*CellData\[\]/)
})

test("onCellClick prop is optional in MapContentProps", () => {
  assert.match(mapContentSource, /onCellClick\?:\s*\(cellId:\s*string\)\s*=>/)
})

test("DiscoveryGrid is guarded by gridCells && onCellClick", () => {
  assert.match(mapContentSource, /\{gridCells\s*&&\s*onCellClick\s*&&/)
})

test("map page does not pass gridCells to MapContent", () => {
  assert.doesNotMatch(mapPageSource, /gridCells=/)
})

test("map page does not pass onCellClick to MapContent", () => {
  assert.doesNotMatch(mapPageSource, /onCellClick=/)
})

test("DiscoveryGrid maps over cells array safely", () => {
  assert.match(discoveryGridSource, /cells\.map\(/)
})
