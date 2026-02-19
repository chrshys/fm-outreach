import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// ============================================================
// handleEnrichCell function exists
// ============================================================

test("defines handleEnrichCell as an async useCallback", () => {
  assert.match(source, /const\s+handleEnrichCell\s*=\s*useCallback\(async\s*\(\)/)
})

// ============================================================
// Guard: returns early if no persistedCell
// ============================================================

test("handleEnrichCell returns early if no persistedCell", () => {
  assert.match(source, /if\s*\(\s*!persistedCell\s*\)\s*return/)
})

// ============================================================
// Sets isEnriching to true
// ============================================================

test("handleEnrichCell sets isEnriching to true", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /setIsEnriching\(true\)/)
})

// ============================================================
// Sets enrichmentSinceRef.current to Date.now()
// ============================================================

test("handleEnrichCell sets enrichmentSinceRef.current = Date.now()", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /enrichmentSinceRef\.current\s*=\s*Date\.now\(\)/)
})

// ============================================================
// Shows info toast
// ============================================================

test("handleEnrichCell shows info toast for enriching leads in cell", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /toast\.info\(["'`]Enriching leads in cell\.\.\.["'`]\)/)
})

// ============================================================
// Calls enrichCellLeads with persistedCell._id
// ============================================================

test("handleEnrichCell calls enrichCellLeads with cellId from persistedCell._id", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /enrichCellLeads\(\{[\s\S]*?cellId:\s*persistedCell\._id\s+as\s+Id<"discoveryCells">/)
})

// ============================================================
// Sets enrichingLeadIds from result.leadIds
// ============================================================

test("handleEnrichCell sets enrichingLeadIds from result leadIds", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /setEnrichingLeadIds\(leadIds\s+as\s+Id<"leads">\[\]\)/)
})

// ============================================================
// Success toast with succeeded/skipped counts when no failures
// ============================================================

test("handleEnrichCell shows success toast when failed === 0", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /if\s*\(failed\s*===\s*0\)/)
  assert.match(fnBody, /toast\.success\(`Enrichment complete: \$\{succeeded\} enriched, \$\{skipped\} skipped`\)/)
})

// ============================================================
// Warning toast with succeeded/failed/skipped counts
// ============================================================

test("handleEnrichCell shows warning toast when there are failures", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /toast\.warning\(`Enrichment done: \$\{succeeded\} enriched, \$\{failed\} failed, \$\{skipped\} skipped`\)/)
})

// ============================================================
// Error toast on catch
// ============================================================

test("handleEnrichCell shows error toast on failure", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  assert.match(fnBody, /toast\.error\(["'`]Enrichment failed\. Please try again\.["'`]\)/)
})

// ============================================================
// Finally block: sets isEnriching to false
// ============================================================

test("handleEnrichCell sets isEnriching to false in finally block", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  const finallyBlock = fnBody.slice(fnBody.indexOf("finally"))
  assert.match(finallyBlock, /setIsEnriching\(false\)/)
})

// ============================================================
// Finally block: clears enrichingLeadIds after delay
// ============================================================

test("handleEnrichCell clears enrichingLeadIds with setTimeout delay", () => {
  const fnBody = source.slice(source.indexOf("handleEnrichCell"))
  const finallyBlock = fnBody.slice(fnBody.indexOf("finally"))
  assert.match(finallyBlock, /setTimeout\(\(\)\s*=>\s*setEnrichingLeadIds\(\[\]\),\s*2000\)/)
})

// ============================================================
// useCallback dependencies include persistedCell and enrichCellLeads
// ============================================================

test("handleEnrichCell useCallback depends on persistedCell and enrichCellLeads", () => {
  // Find the closing of handleEnrichCell's useCallback
  const fnStart = source.indexOf("const handleEnrichCell")
  const afterFn = source.slice(fnStart)
  // Match the dependency array at the end of the useCallback
  assert.match(afterFn, /\[persistedCell,\s*enrichCellLeads\]/)
})
