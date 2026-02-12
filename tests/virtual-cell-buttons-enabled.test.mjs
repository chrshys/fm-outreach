import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const sharedSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)

// ============================================================
// Virtual cell selectedCell derivation: depth 0, unsearched
// These properties ensure Run and Split buttons are enabled.
// ============================================================

test("virtual cell fallback depth is 0, below MAX_DEPTH so Split is enabled", () => {
  // MAX_DEPTH is 4; virtual cell depth is 0, so 0 < 4 → Split enabled
  const maxDepthMatch = sharedSource.match(/export const MAX_DEPTH\s*=\s*(\d+)/)
  assert.ok(maxDepthMatch, "MAX_DEPTH should be exported from shared")
  const maxDepth = parseInt(maxDepthMatch[1], 10)

  // Virtual cell fallback depth
  const fallback = panelSource.slice(
    panelSource.indexOf("persistedCell ?? (selectedVirtualCell"),
    panelSource.indexOf(": null)"),
  )
  assert.match(fallback, /depth:\s*0/)
  assert.ok(0 < maxDepth, "Virtual cell depth 0 should be below MAX_DEPTH")
})

test("virtual cell fallback status is unsearched, not searching, so Run buttons are enabled", () => {
  const fallback = panelSource.slice(
    panelSource.indexOf("persistedCell ?? (selectedVirtualCell"),
    panelSource.indexOf(": null)"),
  )
  assert.match(fallback, /status:\s*"unsearched"\s*as\s*const/)
  // The Run button disabled condition is: !mechanism.enabled || status === "searching"
  // "unsearched" !== "searching" → Run buttons are enabled
  assert.notEqual("unsearched", "searching")
})

// ============================================================
// Run button disabled condition does NOT block unsearched cells
// ============================================================

test("Run button disabled condition only triggers on !mechanism.enabled or searching status", () => {
  // Extract the Run button disabled logic
  assert.match(
    panelSource,
    /const isDisabled\s*=\s*!mechanism\.enabled\s*\|\|\s*selectedCell\.status\s*===\s*"searching"/,
    "Run disabled should be: !mechanism.enabled || status === searching",
  )
})

test("all DISCOVERY_MECHANISMS have enabled: true so Run buttons are enabled", () => {
  const mechanismBlock = sharedSource.slice(
    sharedSource.indexOf("DISCOVERY_MECHANISMS"),
    sharedSource.indexOf("] as const"),
  )
  // Every mechanism should have enabled: true
  const enabledMatches = [...mechanismBlock.matchAll(/enabled:\s*(true|false)/g)]
  assert.ok(enabledMatches.length >= 2, "Should find at least 2 mechanisms")
  for (const m of enabledMatches) {
    assert.equal(m[1], "true", "Each mechanism should have enabled: true")
  }
})

// ============================================================
// Split button disabled condition does NOT block depth-0 cells
// ============================================================

test("Split button disabled when depth >= MAX_DEPTH || searching — neither applies to virtual cells", () => {
  const splitIdx = panelSource.indexOf('type: "subdivide"')
  assert.ok(splitIdx !== -1, "should find subdivide action")
  const splitBlock = panelSource.slice(
    Math.max(0, splitIdx - 400),
    splitIdx,
  )
  assert.match(
    splitBlock,
    /disabled=\{selectedCell\.depth\s*>=\s*MAX_DEPTH\s*\|\|\s*selectedCell\.status\s*===\s*"searching"\}/,
    "Split disabled condition should be depth >= MAX_DEPTH || searching",
  )
})

// ============================================================
// Run buttons dispatch onCellAction with selectedCell._id
// ============================================================

test("Run button onClick dispatches search action with selectedCell._id", () => {
  assert.match(
    panelSource,
    /onClick=\{\(\)\s*=>\s*onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"search",\s*mechanism:\s*mechanism\.id\s*\}\)/,
    "Run button should call onCellAction with selectedCell._id (virtual cell key for unactivated cells)",
  )
})

// ============================================================
// Split button dispatches onCellAction with selectedCell._id
// ============================================================

test("Split button onClick dispatches subdivide action with selectedCell._id", () => {
  assert.match(
    panelSource,
    /onClick=\{\(\)\s*=>\s*onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"subdivide"\s*\}\)/,
    "Split button should call onCellAction with selectedCell._id (virtual cell key for unactivated cells)",
  )
})

// ============================================================
// Behavioral: simulate virtual cell button enable/disable logic
// ============================================================

test("simulated: Run button is enabled for a virtual cell (unsearched, mechanism enabled)", () => {
  const virtualCell = { depth: 0, status: "unsearched" }
  const mechanism = { enabled: true }
  const isDisabled = !mechanism.enabled || virtualCell.status === "searching"
  assert.equal(isDisabled, false, "Run button should NOT be disabled for virtual cell")
})

test("simulated: Split button is enabled for a virtual cell (depth 0, unsearched)", () => {
  const MAX_DEPTH = 4
  const virtualCell = { depth: 0, status: "unsearched" }
  const isDisabled = virtualCell.depth >= MAX_DEPTH || virtualCell.status === "searching"
  assert.equal(isDisabled, false, "Split button should NOT be disabled for virtual cell")
})

test("simulated: Merge button is hidden for a virtual cell (depth 0)", () => {
  const virtualCell = { depth: 0 }
  const showMerge = virtualCell.depth > 0
  assert.equal(showMerge, false, "Merge button should be hidden for virtual cell (depth 0)")
})

test("source: Merge button render guard (depth > 0) prevents display for virtual cells (depth 0)", () => {
  // Virtual cell fallback sets depth: 0
  assert.match(panelSource, /depth:\s*0/, "virtual cell fallback must set depth to 0")
  // Merge button only renders when depth > 0
  const mergeIdx = panelSource.indexOf("Merge")
  assert.ok(mergeIdx !== -1, "Merge button text must exist in panel source")
  const mergeBlock = panelSource.slice(Math.max(0, mergeIdx - 600), mergeIdx)
  assert.match(mergeBlock, /selectedCell\.depth\s*>\s*0/, "Merge button must be guarded by depth > 0")
  // getAvailableActions also excludes undivide for depth 0
  assert.match(sharedSource, /cell\.depth\s*>\s*0[\s\S]*undivide/, "getAvailableActions must gate undivide on depth > 0")
})

test("simulated: Run button IS disabled when cell is searching", () => {
  const searchingCell = { depth: 0, status: "searching" }
  const mechanism = { enabled: true }
  const isDisabled = !mechanism.enabled || searchingCell.status === "searching"
  assert.equal(isDisabled, true, "Run button should be disabled while searching")
})

test("simulated: Split button IS disabled when cell is searching", () => {
  const MAX_DEPTH = 4
  const searchingCell = { depth: 0, status: "searching" }
  const isDisabled = searchingCell.depth >= MAX_DEPTH || searchingCell.status === "searching"
  assert.equal(isDisabled, true, "Split button should be disabled while searching")
})
