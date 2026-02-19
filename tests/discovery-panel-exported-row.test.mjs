import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

const cellProgressIdx = source.indexOf("Cell Progress")
const gridProgressIdx = source.indexOf("Grid Progress")
const cellProgressBlock = source.slice(cellProgressIdx, gridProgressIdx)
const gridProgressBlock = source.slice(gridProgressIdx)

// =============================================================================
// 1. Cell Progress — Exported row
// =============================================================================

test("cell progress shows 'Exported' label", () => {
  assert.match(cellProgressBlock, /Exported/)
})

test("cell progress Exported row references cellLeadStats.exported", () => {
  const idx = cellProgressBlock.indexOf("Exported")
  assert.ok(idx > -1)
  const after = cellProgressBlock.slice(idx, idx + 300)
  assert.match(after, /cellLeadStats\?\.exported/)
})

test("cell progress Exported row shows count out of total", () => {
  const idx = cellProgressBlock.indexOf("Exported")
  assert.ok(idx > -1)
  const after = cellProgressBlock.slice(idx, idx + 300)
  assert.match(after, /cellLeadStats\?\.total/)
})

// =============================================================================
// 2. Grid Progress — Exported row
// =============================================================================

test("grid progress shows 'Exported' label", () => {
  assert.match(gridProgressBlock, /Exported/)
})

test("grid progress Exported row references gridEnrichmentStats.exported", () => {
  const idx = gridProgressBlock.indexOf("Exported")
  assert.ok(idx > -1)
  const after = gridProgressBlock.slice(idx, idx + 400)
  assert.match(after, /gridEnrichmentStats\.exported/)
})

test("grid progress Exported row shows count out of totalLeads", () => {
  const idx = gridProgressBlock.indexOf("Exported")
  assert.ok(idx > -1)
  const after = gridProgressBlock.slice(idx, idx + 400)
  assert.match(after, /gridEnrichmentStats\.totalLeads/)
})

test("grid progress Exported row shows percentage", () => {
  const idx = gridProgressBlock.indexOf("Exported")
  assert.ok(idx > -1)
  const after = gridProgressBlock.slice(idx, idx + 400)
  assert.match(after, /Math\.round/)
})
