import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// ============================================================
// 1. Completion toast shows succeeded/failed/skipped counts
// ============================================================

test("handleEnrichCell destructures succeeded, failed, skipped from result", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /const\s*\{\s*succeeded,\s*failed,\s*skipped\s*\}/)
})

test("success toast includes succeeded and skipped counts", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /toast\.success\(/)
  assert.match(fnBody, /\$\{succeeded\}/)
  assert.match(fnBody, /\$\{skipped\}/)
})

test("warning toast includes succeeded, failed, and skipped counts", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /toast\.warning\(/)
  const warningIdx = fnBody.indexOf("toast.warning(")
  const warningLine = fnBody.slice(warningIdx, fnBody.indexOf(")", warningIdx) + 1)
  assert.ok(warningLine.includes("${succeeded}"), "warning toast should include succeeded count")
  assert.ok(warningLine.includes("${failed}"), "warning toast should include failed count")
  assert.ok(warningLine.includes("${skipped}"), "warning toast should include skipped count")
})

test("warning toast fires only when there are failures", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  // The else branch (warning) is reached when failed !== 0
  assert.match(fnBody, /if\s*\(failed\s*===\s*0\)[\s\S]*?toast\.success[\s\S]*?\}\s*else\s*\{[\s\S]*?toast\.warning/)
})

// ============================================================
// 2. Cell stats update reactively via useQuery subscriptions
// ============================================================

test("cellLeadStats is subscribed via useQuery to getCellLeadStats", () => {
  assert.match(
    source,
    /const\s+cellLeadStats\s*=\s*useQuery\(\s*api\.discovery\.gridCells\.getCellLeadStats/,
    "cellLeadStats must use useQuery (reactive) for getCellLeadStats",
  )
})

test("cellLeadStats query passes cellId from persistedCell", () => {
  const queryStart = source.indexOf("const cellLeadStats = useQuery(")
  const queryBlock = source.slice(queryStart, queryStart + 200)
  assert.match(queryBlock, /cellId:\s*persistedCell\._id\s+as\s+Id<"discoveryCells">/)
})

test("cellLeadStats query skips when no persistedCell", () => {
  const queryStart = source.indexOf("const cellLeadStats = useQuery(")
  const queryBlock = source.slice(queryStart, queryStart + 200)
  assert.ok(queryBlock.includes('"skip"'), "cellLeadStats query should skip when no persistedCell")
})

test("cellLeadIdsForEnrichment is subscribed via reactive useQuery", () => {
  assert.match(
    source,
    /const\s+cellLeadIdsForEnrichment\s*=\s*useQuery\(\s*api\.discovery\.gridCells\.getLeadIdsForEnrichment/,
    "cellLeadIdsForEnrichment must use useQuery (reactive) for getLeadIdsForEnrichment",
  )
})

// ============================================================
// 3. While enrichment is running → button is disabled, cannot double-trigger
// ============================================================

test("Enrich button disabled attribute includes isEnriching guard", () => {
  const selectedCellStart = source.indexOf("{/* Selected Cell */}")
  const selectedCellEnd = source.indexOf("{/* Search Queries */}")
  const section = source.slice(selectedCellStart, selectedCellEnd)
  assert.match(section, /disabled=\{isEnriching/)
})

test("handleEnrichCell guards against missing persistedCell", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /if\s*\(!persistedCell/)
})

test("handleEnrichCell guards against empty cellLeadIdsForEnrichment", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /!cellLeadIdsForEnrichment\?\.length/)
})

test("isEnriching is set to true before the enrichCellLeads call", () => {
  const fnStart = source.indexOf("const handleEnrichCell")
  const fnEnd = source.indexOf("}, [persistedCell", fnStart)
  const fnBody = source.slice(fnStart, fnEnd)

  const setTrueIdx = fnBody.indexOf("setIsEnriching(true)")
  const awaitIdx = fnBody.indexOf("await enrichCellLeads(")

  assert.ok(setTrueIdx !== -1, "setIsEnriching(true) should exist")
  assert.ok(awaitIdx !== -1, "await enrichCellLeads should exist")
  assert.ok(setTrueIdx < awaitIdx, "isEnriching must be set to true BEFORE the action call to prevent double-trigger")
})

test("isEnriching is set to false in the finally block", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  const finallyBlock = fnBody.slice(fnBody.indexOf("finally"))
  assert.match(finallyBlock, /setIsEnriching\(false\)/)
})
