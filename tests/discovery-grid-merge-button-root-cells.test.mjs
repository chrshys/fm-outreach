import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// Extract the CellTooltipContent function body for targeted assertions
const tooltipStart = source.indexOf("function CellTooltipContent")
const tooltipEnd = source.indexOf("function DiscoveryGridCell")
const tooltipBlock = source.slice(tooltipStart, tooltipEnd)

test("merge button visibility uses depth > 0, not parentCellId", () => {
  assert.match(tooltipBlock, /cell\.depth\s*>\s*0\s*&&/)
  assert.doesNotMatch(tooltipBlock, /cell\.parentCellId\s*&&/)
})

test("merge button renders Minimize2 icon and Merge label", () => {
  assert.match(tooltipBlock, /<Minimize2/)
  assert.match(tooltipBlock, /Merge/)
})

test("merge button triggers undivide action on click", () => {
  assert.match(
    tooltipBlock,
    /onCellAction\(cell\._id,\s*\{\s*type:\s*"undivide"\s*\}\)/,
  )
})

test("getAvailableActions includes undivide for depth > 0 cells without parentCellId", () => {
  const fnBlock = source.slice(
    source.indexOf("export function getAvailableActions"),
    source.indexOf("function formatShortDate"),
  )
  // The condition should be depth > 0, not parentCellId
  assert.match(fnBlock, /cell\.depth\s*>\s*0/)
  assert.doesNotMatch(fnBlock, /cell\.parentCellId/)
})
