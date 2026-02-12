import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const mapContentSource = fs.readFileSync(
  "src/components/map/map-content.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// DiscoveryGrid click-to-select interface
// ============================================================

test("DiscoveryGridProps has selectedCellId: string | null", () => {
  assert.match(gridSource, /selectedCellId:\s*string\s*\|\s*null/)
})

test("DiscoveryGridProps has onCellSelect: (cellId: string | null) => void", () => {
  assert.match(gridSource, /onCellSelect:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
})

test("DiscoveryGridProps does NOT have onCellAction", () => {
  assert.doesNotMatch(gridSource, /onCellAction/)
})

test("DiscoveryGrid compares cell._id to selectedCellId for selection", () => {
  assert.match(gridSource, /cell\._id\s*===\s*selectedCellId/)
})

test("DiscoveryGrid applies distinct style to selected cell", () => {
  assert.match(gridSource, /isSelected/)
  assert.match(gridSource, /weight:\s*3/)
  assert.match(gridSource, /color:\s*"#2563eb"/)
})

test("DiscoveryGrid attaches click eventHandler calling onCellSelect", () => {
  assert.match(gridSource, /eventHandlers/)
  assert.match(gridSource, /click:\s*\(e\)\s*=>\s*\{/)
  assert.match(gridSource, /onCellSelect\(isSelected\s*\?\s*null\s*:\s*cell\._id\)/)
})

test("clicking selected cell deselects (passes null)", () => {
  assert.match(gridSource, /onCellSelect\(isSelected\s*\?\s*null\s*:\s*cell\._id\)/)
})

// ============================================================
// MapContent passes selectedCellId and onCellSelect
// ============================================================

test("MapContent has selectedCellId optional prop", () => {
  assert.match(mapContentSource, /selectedCellId\?:\s*string\s*\|\s*null/)
})

test("MapContent has onCellSelect optional prop", () => {
  assert.match(mapContentSource, /onCellSelect\?:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
})

test("MapContent guards DiscoveryGrid with gridCells && onCellSelect", () => {
  assert.match(mapContentSource, /gridCells\s*&&\s*onCellSelect/)
})

test("MapContent passes selectedCellId to DiscoveryGrid", () => {
  assert.match(mapContentSource, /selectedCellId=\{selectedCellId\s*\?\?\s*null\}/)
})

test("MapContent passes onCellSelect to DiscoveryGrid", () => {
  assert.match(mapContentSource, /onCellSelect=\{onCellSelect\}/)
})

// ============================================================
// Map page selectedCellId state
// ============================================================

test("map page has selectedCellId state initialized to null", () => {
  assert.match(pageSource, /useMapStore\(\(s\)\s*=>\s*s\.selectedCellId\)/)
})

test("map page passes selectedCellId to MapContent conditionally on discovery mode", () => {
  assert.match(pageSource, /selectedCellId=\{viewMode\s*===\s*"discovery"\s*\?\s*selectedCellId\s*:\s*null\}/)
})

test("map page passes handleCellSelect as onCellSelect in discovery mode", () => {
  assert.match(pageSource, /onCellSelect=\{viewMode\s*===\s*"discovery"\s*\?\s*handleCellSelect\s*:\s*undefined\}/)
})
