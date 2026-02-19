import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// Extract the selected cell section for scoped assertions
const selectedCellStart = source.indexOf("{/* Selected Cell */}")
const selectedCellEnd = source.indexOf("{/* Search Queries */}")
const selectedCellSection = source.slice(selectedCellStart, selectedCellEnd)

// ============================================================
// EnrichmentProgress is conditionally rendered below the enrich button
// ============================================================

test("EnrichmentProgress is rendered in the selected cell section", () => {
  assert.ok(
    selectedCellSection.includes("<EnrichmentProgress"),
    "Selected Cell section should contain <EnrichmentProgress",
  )
})

test("EnrichmentProgress is gated on isEnriching && enrichingLeadIds.length > 0", () => {
  assert.match(
    selectedCellSection,
    /\{isEnriching && enrichingLeadIds\.length > 0 &&/,
    "EnrichmentProgress should be conditionally rendered with isEnriching && enrichingLeadIds.length > 0",
  )
})

test("EnrichmentProgress receives leadIds prop from enrichingLeadIds", () => {
  assert.match(
    selectedCellSection,
    /EnrichmentProgress\s+leadIds=\{enrichingLeadIds\}/,
    "EnrichmentProgress should receive leadIds={enrichingLeadIds}",
  )
})

test("EnrichmentProgress receives since prop from enrichmentSinceRef.current", () => {
  assert.match(
    selectedCellSection,
    /since=\{enrichmentSinceRef\.current\}/,
    "EnrichmentProgress should receive since={enrichmentSinceRef.current}",
  )
})

test("EnrichmentProgress appears after the Enrich button", () => {
  const enrichBtnIdx = selectedCellSection.indexOf("handleEnrichCell")
  const progressIdx = selectedCellSection.indexOf("<EnrichmentProgress")
  assert.ok(enrichBtnIdx !== -1, "Should find Enrich button")
  assert.ok(progressIdx !== -1, "Should find EnrichmentProgress")
  assert.ok(
    progressIdx > enrichBtnIdx,
    "EnrichmentProgress should appear after the Enrich button",
  )
})
