import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

const cellProgressIdx = source.indexOf("Cell Progress")
const gridProgressIdx = source.indexOf("Grid Progress")
const cellProgressBlock = source.slice(cellProgressIdx, gridProgressIdx)

// =============================================================================
// 1. Progress bar exists in Cell Progress section with correct styling
// =============================================================================

test("cell progress contains an indigo progress bar", () => {
  assert.match(cellProgressBlock, /bg-indigo-500/)
})

test("indigo progress bar uses same structure as grid progress bar", () => {
  assert.match(cellProgressBlock, /h-1\.5\s+w-full\s+overflow-hidden\s+rounded-full\s+bg-muted/)
  assert.match(cellProgressBlock, /h-full\s+rounded-full\s+bg-indigo-500\s+transition-all/)
})

// =============================================================================
// 2. Progress bar width is driven by directoryReady / total
// =============================================================================

test("indigo bar width uses directoryReady divided by total", () => {
  assert.match(cellProgressBlock, /directoryReady/)
  assert.match(cellProgressBlock, /\.total/)
})

// =============================================================================
// 3. Progress bar is inside the total > 0 guard
// =============================================================================

test("indigo bar is within the enrichment stats block gated on total > 0", () => {
  // The bar should appear after the "Has Web/Social" row and before the closing of the total>0 block
  const webSocialIdx = cellProgressBlock.indexOf("Has Web/Social")
  assert.ok(webSocialIdx > -1, "Has Web/Social row exists")
  const indigoIdx = cellProgressBlock.indexOf("bg-indigo-500")
  assert.ok(indigoIdx > -1, "bg-indigo-500 exists")
  assert.ok(indigoIdx > webSocialIdx, "indigo bar appears after Has Web/Social row")
})
