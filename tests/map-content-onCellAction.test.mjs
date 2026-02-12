import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("imports CellData type from discovery-grid", () => {
  assert.match(source, /import\s+type\s+\{[\s\S]*CellData[\s\S]*\}\s+from\s+["']\.\/discovery-grid["']/)
})

test("selectedCellId prop accepts string or null", () => {
  assert.match(source, /selectedCellId\?:\s*string\s*\|\s*null/)
})

test("onCellSelect prop accepts cellId string or null", () => {
  assert.match(source, /onCellSelect\?:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
})

test("does not use onCellClick prop", () => {
  assert.doesNotMatch(source, /onCellClick/)
})

test("passes selectedCellId and onCellSelect to DiscoveryGrid component", () => {
  assert.match(source, /<DiscoveryGrid\s+cells=\{gridCells\}\s+selectedCellId=/)
  assert.match(source, /onCellSelect=\{onCellSelect\}/)
})

test("conditionally renders DiscoveryGrid when gridCells and onCellSelect are present", () => {
  assert.match(source, /gridCells\s*&&\s*onCellSelect/)
})

test("destructures onCellSelect from props", () => {
  assert.match(source, /onCellSelect[,\s}]/)
})
