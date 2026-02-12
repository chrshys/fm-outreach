import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("imports DiscoveryGrid from ./discovery-grid", () => {
  assert.match(source, /import\s+DiscoveryGrid\s+from\s+["']\.\/discovery-grid["']/)
})

test("imports CellData type from ./discovery-grid", () => {
  assert.match(source, /import\s+type\s+\{.*CellData.*\}\s+from\s+["']\.\/discovery-grid["']/)
})

test("imports MapBoundsEmitter from ./map-bounds-emitter", () => {
  assert.match(source, /import\s+\{\s*MapBoundsEmitter\s*\}\s+from\s+["']\.\/map-bounds-emitter["']/)
})

test("imports MapBounds type from ./map-bounds-emitter", () => {
  assert.match(source, /import\s+type\s+\{\s*MapBounds\s*\}\s+from\s+["']\.\/map-bounds-emitter["']/)
})

test("MapContentProps includes optional gridCells of CellData[]", () => {
  assert.match(source, /gridCells\?:\s*CellData\[\]/)
})

test("MapContentProps includes optional selectedCellId", () => {
  assert.match(source, /selectedCellId\?:\s*string\s*\|\s*null/)
})

test("MapContentProps includes optional onCellSelect callback", () => {
  assert.match(source, /onCellSelect\?:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
})

test("MapContentProps includes optional onBoundsChange callback", () => {
  assert.match(source, /onBoundsChange\?:\s*\(bounds:\s*MapBounds\)\s*=>\s*void/)
})

test("destructures gridCells, selectedCellId, onCellSelect, onBoundsChange in function params", () => {
  assert.match(source, /gridCells/)
  assert.match(source, /selectedCellId/)
  assert.match(source, /onCellSelect/)
  assert.match(source, /onBoundsChange/)
  // All should appear in the function signature
  const funcMatch = source.match(/export default function MapContent\(\{([^}]+)\}/)
  assert.ok(funcMatch, "should have MapContent function with destructured params")
  const params = funcMatch[1]
  assert.ok(params.includes("gridCells"), "gridCells in function params")
  assert.ok(params.includes("selectedCellId"), "selectedCellId in function params")
  assert.ok(params.includes("onCellSelect"), "onCellSelect in function params")
  assert.ok(params.includes("onBoundsChange"), "onBoundsChange in function params")
})

test("renders DiscoveryGrid conditionally when gridCells and onCellSelect provided", () => {
  assert.match(source, /gridCells\s*&&\s*onCellSelect\s*\?/)
  assert.match(source, /<DiscoveryGrid\s+cells=\{gridCells\}\s+selectedCellId=/)
})

test("renders MapBoundsEmitter conditionally when onBoundsChange provided", () => {
  assert.match(source, /onBoundsChange\s*&&/)
  assert.match(source, /<MapBoundsEmitter\s+onBoundsChange=\{onBoundsChange\}\s*\/>/)
})

test("DiscoveryGrid and MapBoundsEmitter are rendered inside MapContainer", () => {
  const mapContainerStart = source.indexOf("<MapContainer")
  const mapContainerEnd = source.indexOf("</MapContainer>")
  const gridPos = source.indexOf("<DiscoveryGrid")
  const boundsPos = source.indexOf("<MapBoundsEmitter")

  assert.ok(mapContainerStart >= 0, "MapContainer should exist")
  assert.ok(mapContainerEnd >= 0, "MapContainer closing tag should exist")
  assert.ok(gridPos > mapContainerStart && gridPos < mapContainerEnd,
    "DiscoveryGrid should be inside MapContainer")
  assert.ok(boundsPos > mapContainerStart && boundsPos < mapContainerEnd,
    "MapBoundsEmitter should be inside MapContainer")
})
