import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// ============================================================
// Enrichment local state
// ============================================================

test("has isEnriching state via useState(false)", () => {
  assert.match(source, /const\s+\[isEnriching,\s*setIsEnriching\]\s*=\s*useState\(false\)/)
})

test("has enrichingLeadIds state with Id<leads> array type", () => {
  assert.match(source, /const\s+\[enrichingLeadIds,\s*setEnrichingLeadIds\]\s*=\s*useState<Id<"leads">\[\]>\(\[\]\)/)
})

test("has enrichmentSinceRef via useRef(0)", () => {
  assert.match(source, /const\s+enrichmentSinceRef\s*=\s*useRef\(0\)/)
})

// ============================================================
// enrichCellLeads action
// ============================================================

test("calls useAction with api.enrichment.batchEnrichPublic.enrichCellLeads", () => {
  assert.match(source, /const\s+enrichCellLeads\s*=\s*useAction\(api\.enrichment\.batchEnrichPublic\.enrichCellLeads\)/)
})
