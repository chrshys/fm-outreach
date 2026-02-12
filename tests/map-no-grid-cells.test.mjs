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

test("onCellSelect prop is optional in MapContentProps", () => {
  assert.match(mapContentSource, /onCellSelect\?:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
})

test("DiscoveryGrid is guarded by gridCells && onCellSelect", () => {
  assert.match(mapContentSource, /\{gridCells\s*&&\s*onCellSelect\s*&&/)
})

test("map page conditionally passes gridCells to MapContent in discovery mode", () => {
  assert.match(mapPageSource, /gridCells=\{viewMode\s*===\s*"discovery"/)
})

test("map page conditionally passes onCellSelect to MapContent in discovery mode", () => {
  assert.match(mapPageSource, /onCellSelect=\{viewMode\s*===\s*"discovery"/)
})

test("DiscoveryGrid maps over cells array safely", () => {
  assert.match(discoveryGridSource, /cells\.map\(/)
})
