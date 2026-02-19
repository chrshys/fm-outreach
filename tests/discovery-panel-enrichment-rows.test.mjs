import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

const cellProgressIdx = source.indexOf("Cell Progress")
const gridProgressIdx = source.indexOf("Grid Progress")
const cellProgressBlock = source.slice(cellProgressIdx, gridProgressIdx)

// =============================================================================
// 1. Enrichment detail rows exist in Cell Progress section
// =============================================================================

test("cell progress shows 'Directory Ready' row with cellLeadStats.directoryReady", () => {
  assert.match(cellProgressBlock, /Directory Ready/)
  assert.match(cellProgressBlock, /cellLeadStats\?\.directoryReady/)
})

test("cell progress shows 'Location Complete' row with cellLeadStats.locationComplete", () => {
  assert.match(cellProgressBlock, /Location Complete/)
  assert.match(cellProgressBlock, /cellLeadStats\?\.locationComplete/)
})

test("cell progress shows 'Has Web/Social' row with cellLeadStats.hasWebPresence", () => {
  assert.match(cellProgressBlock, /Has Web\/Social/)
  assert.match(cellProgressBlock, /cellLeadStats\?\.hasWebPresence/)
})

// =============================================================================
// 2. Enrichment rows show value out of total
// =============================================================================

test("Directory Ready shows count out of total", () => {
  // Find the Directory Ready row and check it includes / {cellLeadStats?.total}
  const dirReadyIdx = cellProgressBlock.indexOf("Directory Ready")
  assert.ok(dirReadyIdx > -1)
  const afterDirReady = cellProgressBlock.slice(dirReadyIdx, dirReadyIdx + 300)
  assert.match(afterDirReady, /cellLeadStats\?\.total/)
})

test("Location Complete shows count out of total", () => {
  const locCompleteIdx = cellProgressBlock.indexOf("Location Complete")
  assert.ok(locCompleteIdx > -1)
  const afterLocComplete = cellProgressBlock.slice(locCompleteIdx, locCompleteIdx + 300)
  assert.match(afterLocComplete, /cellLeadStats\?\.total/)
})

test("Has Web/Social shows count out of total", () => {
  const webIdx = cellProgressBlock.indexOf("Has Web/Social")
  assert.ok(webIdx > -1)
  const afterWeb = cellProgressBlock.slice(webIdx, webIdx + 300)
  assert.match(afterWeb, /cellLeadStats\?\.total/)
})

// =============================================================================
// 3. Enrichment rows only shown when total > 0
// =============================================================================

test("enrichment detail rows gated on cellLeadStats.total > 0", () => {
  assert.match(cellProgressBlock, /cellLeadStats\?\.total\s*\?\?\s*0\)\s*>\s*0/)
})
