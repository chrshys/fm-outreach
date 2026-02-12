import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const sharedSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)
const mapContentSource = fs.readFileSync(
  "src/components/map/map-content.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// CellAction type definition (defined in discovery-grid-shared, re-exported from discovery-grid)
// ============================================================

test("exports CellAction type", () => {
  assert.match(sharedSource, /export\s+type\s+CellAction/)
})

test("CellAction includes search variant with mechanism field", () => {
  assert.match(sharedSource, /\{\s*type:\s*"search";\s*mechanism:\s*string\s*\}/)
})

test("CellAction includes subdivide variant", () => {
  assert.match(sharedSource, /\{\s*type:\s*"subdivide"\s*\}/)
})

test("CellAction includes undivide variant", () => {
  assert.match(sharedSource, /\{\s*type:\s*"undivide"\s*\}/)
})

test("CellAction is a discriminated union with three variants", () => {
  const actionBlock = sharedSource.slice(
    sharedSource.indexOf("export type CellAction"),
    sharedSource.indexOf("export type CellData"),
  )
  const pipeCount = (actionBlock.match(/\|/g) || []).length
  assert.equal(pipeCount, 3, "should have 3 union pipes for 3 variants")
})

test("discovery-grid re-exports CellAction from discovery-grid-shared", () => {
  assert.match(gridSource, /export\s+type\s+\{[^}]*CellAction[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})

// ============================================================
// DiscoveryGrid uses selectedCellId and onCellSelect props
// ============================================================

test("DiscoveryGridProps uses selectedCellId and onCellSelect", () => {
  assert.match(gridSource, /selectedCellId:\s*string\s*\|\s*null/)
  assert.match(gridSource, /onCellSelect:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
  assert.doesNotMatch(gridSource, /onCellClick/)
})

test("DiscoveryGrid destructures selectedCellId and onCellSelect in function params", () => {
  assert.match(gridSource, /\{\s*cells,\s*selectedCellId,\s*onCellSelect/)
})

// ============================================================
// MapContent uses selectedCellId and onCellSelect
// ============================================================

test("MapContent imports CellData type from discovery-grid", () => {
  assert.match(mapContentSource, /import\s+type\s+\{.*CellData.*\}\s+from\s+["']\.\/discovery-grid["']/)
})

test("MapContent prop type uses selectedCellId and onCellSelect", () => {
  assert.match(mapContentSource, /selectedCellId\?:\s*string\s*\|\s*null/)
  assert.match(mapContentSource, /onCellSelect\?:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
})

test("MapContent passes selectedCellId and onCellSelect to DiscoveryGrid", () => {
  assert.match(mapContentSource, /<DiscoveryGrid\s+cells=\{gridCells\}\s+selectedCellId=/)
  assert.match(mapContentSource, /onCellSelect=\{onCellSelect\}/)
})

// ============================================================
// Map page uses selectedCellId state and passes onCellSelect
// ============================================================

test("map page imports CellAction type from discovery-grid-shared", () => {
  assert.match(pageSource, /import\s+type\s+\{.*CellAction.*\}\s+from\s+["']@\/components\/map\/discovery-grid-shared["']/)
})

test("map page has selectedCellId state", () => {
  assert.match(pageSource, /useMapStore\(\(s\)\s*=>\s*s\.selectedCellId\)/)
})

test("map page passes selectedCellId to MapContent", () => {
  assert.match(pageSource, /selectedCellId=\{viewMode\s*===\s*"discovery"\s*\?\s*selectedCellId\s*:\s*null\}/)
})

test("map page passes onCellSelect to MapContent", () => {
  assert.match(pageSource, /onCellSelect=\{viewMode\s*===\s*"discovery"\s*\?\s*handleCellSelect\s*:\s*undefined\}/)
})

// ============================================================
// handleCellAction still exists for dispatching actions
// ============================================================

test("handleCellAction signature accepts cellId and CellAction", () => {
  assert.match(pageSource, /handleCellAction\s*=\s*useCallback\(async\s*\(cellId:\s*string,\s*action:\s*CellAction\)/)
})

test("handleCellAction dispatches search via action.type", () => {
  assert.match(pageSource, /action\.type\s*===\s*"search"/)
})

test("handleCellAction dispatches subdivide via action.type", () => {
  assert.match(pageSource, /action\.type\s*===\s*"subdivide"/)
})
