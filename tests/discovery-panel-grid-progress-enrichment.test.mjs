import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

const gridProgressIdx = source.indexOf("Grid Progress")
// Grab the Grid Progress block up to the next Separator or section boundary
const afterGridProgress = source.slice(gridProgressIdx, source.indexOf("{/* Selected Cell */}", gridProgressIdx))

// =============================================================================
// 1. "Total Leads" replaces "Leads Found" in Grid Progress
// =============================================================================

test("Grid Progress shows 'Total Leads' label instead of 'Leads Found'", () => {
  assert.match(afterGridProgress, /Total Leads/)
  assert.ok(!afterGridProgress.includes("Leads Found"), "should not contain old 'Leads Found' label")
})

test("Total Leads uses gridEnrichmentStats with fallback to selectedGrid.totalLeadsFound", () => {
  assert.match(afterGridProgress, /gridEnrichmentStats\?\.totalLeads\s*\?\?\s*selectedGrid\.totalLeadsFound/)
})

// =============================================================================
// 2. "Directory Ready" row in Grid Progress
// =============================================================================

test("Grid Progress shows 'Directory Ready' row", () => {
  assert.match(afterGridProgress, /Directory Ready/)
})

test("Directory Ready shows directoryReady / totalLeads", () => {
  const dirReadyIdx = afterGridProgress.indexOf("Directory Ready")
  assert.ok(dirReadyIdx > -1)
  const afterDirReady = afterGridProgress.slice(dirReadyIdx, dirReadyIdx + 400)
  assert.match(afterDirReady, /gridEnrichmentStats\.directoryReady/)
  assert.match(afterDirReady, /gridEnrichmentStats\.totalLeads/)
})

test("Directory Ready shows percentage", () => {
  const dirReadyIdx = afterGridProgress.indexOf("Directory Ready")
  const afterDirReady = afterGridProgress.slice(dirReadyIdx, dirReadyIdx + 500)
  assert.match(afterDirReady, /Math\.round.*directoryReady.*totalLeads.*100/)
})

// =============================================================================
// 3. "Needs Attention" row in Grid Progress
// =============================================================================

test("Grid Progress shows 'Needs Attention' row", () => {
  assert.match(afterGridProgress, /Needs Attention/)
})

test("Needs Attention shows totalLeads minus directoryReady", () => {
  const needsIdx = afterGridProgress.indexOf("Needs Attention")
  assert.ok(needsIdx > -1)
  const afterNeeds = afterGridProgress.slice(needsIdx, needsIdx + 300)
  assert.match(afterNeeds, /gridEnrichmentStats\.totalLeads\s*-\s*gridEnrichmentStats\.directoryReady/)
})

test("Needs Attention uses amber color", () => {
  const needsIdx = afterGridProgress.indexOf("Needs Attention")
  const afterNeeds = afterGridProgress.slice(needsIdx, needsIdx + 300)
  assert.match(afterNeeds, /text-amber-500/)
})

// =============================================================================
// 4. Enrichment rows gated on gridEnrichmentStats && totalLeads > 0
// =============================================================================

test("enrichment rows gated on gridEnrichmentStats && totalLeads > 0", () => {
  assert.match(afterGridProgress, /gridEnrichmentStats\s*&&\s*gridEnrichmentStats\.totalLeads\s*>\s*0/)
})
