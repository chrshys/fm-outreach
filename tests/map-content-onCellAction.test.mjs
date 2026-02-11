import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("imports CellAction type from discovery-grid", () => {
  assert.match(source, /import\s+type\s+\{[\s\S]*CellAction[\s\S]*\}\s+from\s+["']\.\/discovery-grid["']/)
})

test("onCellAction prop accepts cellId string and CellAction", () => {
  assert.match(source, /onCellAction\?:\s*\(cellId:\s*string,\s*action:\s*CellAction\)\s*=>\s*void/)
})

test("does not use onCellClick prop", () => {
  assert.doesNotMatch(source, /onCellClick/)
})

test("passes onCellAction to DiscoveryGrid component", () => {
  assert.match(source, /<DiscoveryGrid\s+cells=\{gridCells\}\s+onCellAction=\{onCellAction\}\s*\/>/)
})

test("conditionally renders DiscoveryGrid when gridCells and onCellAction are present", () => {
  assert.match(source, /gridCells\s*&&\s*onCellAction/)
})

test("destructures onCellAction from props", () => {
  assert.match(source, /onCellAction[,\s}]/)
})
