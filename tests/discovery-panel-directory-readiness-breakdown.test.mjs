import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

// ---------------------------------------------------------------------------
// Source files
// ---------------------------------------------------------------------------
const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")
const querySource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")

const cellProgressIdx = panelSource.indexOf("Cell Progress")
const gridProgressIdx = panelSource.indexOf("Grid Progress")
const cellProgressBlock = panelSource.slice(cellProgressIdx, gridProgressIdx)

// =============================================================================
// 1. Breakdown rows appear in correct order within Cell Progress
// =============================================================================

test("breakdown rows appear in order: Total Leads → Directory Ready → Location Complete → Has Web/Social", () => {
  const totalIdx = cellProgressBlock.indexOf("Total Leads")
  const dirReadyIdx = cellProgressBlock.indexOf("Directory Ready")
  const locCompleteIdx = cellProgressBlock.indexOf("Location Complete")
  const webSocialIdx = cellProgressBlock.indexOf("Has Web/Social")

  assert.ok(totalIdx > -1, "Total Leads row exists")
  assert.ok(dirReadyIdx > -1, "Directory Ready row exists")
  assert.ok(locCompleteIdx > -1, "Location Complete row exists")
  assert.ok(webSocialIdx > -1, "Has Web/Social row exists")

  assert.ok(totalIdx < dirReadyIdx, "Total Leads before Directory Ready")
  assert.ok(dirReadyIdx < locCompleteIdx, "Directory Ready before Location Complete")
  assert.ok(locCompleteIdx < webSocialIdx, "Location Complete before Has Web/Social")
})

// =============================================================================
// 2. Each breakdown row displays count / total format
// =============================================================================

test("Directory Ready row shows directoryReady / total", () => {
  const dirReadyIdx = cellProgressBlock.indexOf("Directory Ready")
  const nextRowIdx = cellProgressBlock.indexOf("Location Complete")
  const dirReadyRow = cellProgressBlock.slice(dirReadyIdx, nextRowIdx)
  assert.match(dirReadyRow, /cellLeadStats\?\.directoryReady/)
  assert.match(dirReadyRow, /cellLeadStats\?\.total/)
})

test("Location Complete row shows locationComplete / total", () => {
  const locCompleteIdx = cellProgressBlock.indexOf("Location Complete")
  const nextRowIdx = cellProgressBlock.indexOf("Has Web/Social")
  const locCompleteRow = cellProgressBlock.slice(locCompleteIdx, nextRowIdx)
  assert.match(locCompleteRow, /cellLeadStats\?\.locationComplete/)
  assert.match(locCompleteRow, /cellLeadStats\?\.total/)
})

test("Has Web/Social row shows hasWebPresence / total", () => {
  const webSocialIdx = cellProgressBlock.indexOf("Has Web/Social")
  const afterWeb = cellProgressBlock.slice(webSocialIdx, webSocialIdx + 300)
  assert.match(afterWeb, /cellLeadStats\?\.hasWebPresence/)
  assert.match(afterWeb, /cellLeadStats\?\.total/)
})

// =============================================================================
// 3. Total Leads row appears outside the total > 0 guard (always visible)
// =============================================================================

test("Total Leads row is outside the total > 0 conditional block", () => {
  const totalLeadsIdx = cellProgressBlock.indexOf("Total Leads")
  const guardIdx = cellProgressBlock.indexOf("cellLeadStats?.total ?? 0) > 0")
  assert.ok(totalLeadsIdx > -1, "Total Leads exists")
  assert.ok(guardIdx > -1, "total > 0 guard exists")
  assert.ok(totalLeadsIdx < guardIdx, "Total Leads appears before the guard (always visible)")
})

// =============================================================================
// 4. Breakdown rows (Directory Ready, Location Complete, Has Web/Social) are
//    inside the total > 0 guard
// =============================================================================

test("enrichment breakdown rows are inside total > 0 guard", () => {
  const guardIdx = cellProgressBlock.indexOf("cellLeadStats?.total ?? 0) > 0")
  const dirReadyIdx = cellProgressBlock.indexOf("Directory Ready")
  const locCompleteIdx = cellProgressBlock.indexOf("Location Complete")
  const webSocialIdx = cellProgressBlock.indexOf("Has Web/Social")

  assert.ok(dirReadyIdx > guardIdx, "Directory Ready is after total > 0 guard")
  assert.ok(locCompleteIdx > guardIdx, "Location Complete is after total > 0 guard")
  assert.ok(webSocialIdx > guardIdx, "Has Web/Social is after total > 0 guard")
})

// =============================================================================
// 5. getCellLeadStats query returns all four count fields needed by breakdown
// =============================================================================

test("getCellLeadStats return object includes total, locationComplete, hasWebPresence, directoryReady", () => {
  const queryIdx = querySource.indexOf("getCellLeadStats")
  assert.ok(queryIdx > -1, "getCellLeadStats exists")
  const queryBlock = querySource.slice(queryIdx, queryIdx + 1500)
  assert.match(queryBlock, /total:\s*leads\.length/)
  assert.match(queryBlock, /locationComplete/)
  assert.match(queryBlock, /hasWebPresence/)
  assert.match(queryBlock, /directoryReady/)
})

// =============================================================================
// 6. directoryReady requires BOTH locationComplete AND hasWebPresence
// =============================================================================

test("directoryReady is counted via shared evaluateLeadEnrichment helper", () => {
  const queryIdx = querySource.indexOf("getCellLeadStats")
  const queryBlock = querySource.slice(queryIdx, queryIdx + 1500)
  assert.match(queryBlock, /evaluateLeadEnrichment\(lead\)/)
})

// =============================================================================
// 7. Panel fetches cellLeadStats via useQuery with correct args
// =============================================================================

test("useQuery for getCellLeadStats passes cellId from persistedCell", () => {
  assert.match(panelSource, /useQuery\(\s*\n?\s*api\.discovery\.gridCells\.getCellLeadStats/)
  assert.match(panelSource, /cellId:\s*persistedCell\._id\s*as\s*Id<"discoveryCells">/)
})

test("getCellLeadStats query is skipped when no persistedCell", () => {
  // The skip sentinel ensures we don't query when there's no real cell
  assert.match(panelSource, /:\s*"skip"/)
})

// =============================================================================
// 8. Cell Progress section uses cellLeadStats (not stale leadsFound field)
// =============================================================================

test("Cell Progress section does not use deprecated leadsFound field", () => {
  assert.ok(!cellProgressBlock.includes("leadsFound"), "Cell Progress should not reference leadsFound")
})
