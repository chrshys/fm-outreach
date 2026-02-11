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

test("onCellAction prop is optional in MapContentProps", () => {
  assert.match(mapContentSource, /onCellAction\?:\s*\(cellId:\s*string,\s*action:\s*CellAction\)\s*=>/)
})

test("DiscoveryGrid is guarded by gridCells && onCellAction", () => {
  assert.match(mapContentSource, /\{gridCells\s*&&\s*onCellAction\s*&&/)
})

test("map page conditionally passes gridCells to MapContent in discovery mode", () => {
  assert.match(mapPageSource, /gridCells=\{viewMode\s*===\s*"discovery"/)
})

test("map page conditionally passes onCellAction to MapContent in discovery mode", () => {
  assert.match(mapPageSource, /onCellAction=\{viewMode\s*===\s*"discovery"/)
})

test("DiscoveryGrid maps over cells array safely", () => {
  assert.match(discoveryGridSource, /cells\.map\(/)
})
