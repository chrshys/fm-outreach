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
// CellAction type definition
// ============================================================

test("exports CellAction type", () => {
  assert.match(gridSource, /export\s+type\s+CellAction/)
})

test("CellAction includes search variant with mechanism field", () => {
  assert.match(gridSource, /\{\s*type:\s*"search";\s*mechanism:\s*string\s*\}/)
})

test("CellAction includes subdivide variant", () => {
  assert.match(gridSource, /\{\s*type:\s*"subdivide"\s*\}/)
})

test("CellAction includes undivide variant", () => {
  assert.match(gridSource, /\{\s*type:\s*"undivide"\s*\}/)
})

test("CellAction is a discriminated union with three variants", () => {
  const actionBlock = gridSource.slice(
    gridSource.indexOf("export type CellAction"),
    gridSource.indexOf("export type CellData"),
  )
  const pipeCount = (actionBlock.match(/\|/g) || []).length
  assert.equal(pipeCount, 3, "should have 3 union pipes for 3 variants")
})

// ============================================================
// DiscoveryGrid uses onCellAction prop
// ============================================================

test("DiscoveryGridProps uses onCellAction instead of onCellClick", () => {
  assert.match(gridSource, /onCellAction:\s*\(cellId:\s*string,\s*action:\s*CellAction\)\s*=>\s*void/)
  assert.doesNotMatch(gridSource, /onCellClick/)
})

test("DiscoveryGrid destructures onCellAction in function params", () => {
  assert.match(gridSource, /\{\s*cells,\s*onCellAction/)
})

// ============================================================
// MapContent uses onCellAction
// ============================================================

test("MapContent imports CellAction type from discovery-grid", () => {
  assert.match(mapContentSource, /import\s+type\s+\{.*CellAction.*\}\s+from\s+["']\.\/discovery-grid["']/)
})

test("MapContent prop type uses onCellAction", () => {
  assert.match(mapContentSource, /onCellAction\?:\s*\(cellId:\s*string,\s*action:\s*CellAction\)\s*=>\s*void/)
})

test("MapContent passes onCellAction to DiscoveryGrid", () => {
  assert.match(mapContentSource, /<DiscoveryGrid\s+cells=\{gridCells\}\s+onCellAction=\{onCellAction\}/)
})

// ============================================================
// Map page handleCellAction dispatches by action type
// ============================================================

test("map page imports CellAction type", () => {
  assert.match(pageSource, /import\s+type\s+\{.*CellAction.*\}\s+from\s+["']@\/components\/map\/discovery-grid["']/)
})

test("handleCellAction signature accepts cellId and CellAction", () => {
  assert.match(pageSource, /handleCellAction\s*=\s*useCallback\(async\s*\(cellId:\s*string,\s*action:\s*CellAction\)/)
})

test("handleCellAction dispatches search via action.type", () => {
  assert.match(pageSource, /action\.type\s*===\s*"search"/)
})

test("handleCellAction dispatches subdivide via action.type", () => {
  assert.match(pageSource, /action\.type\s*===\s*"subdivide"/)
})

test("map page passes handleCellAction as onCellAction to MapContent", () => {
  assert.match(pageSource, /onCellAction=\{.*handleCellAction/)
})
