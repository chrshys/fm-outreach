import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// Extract the Selected Cell section for scoped assertions
const selectedCellStart = source.indexOf("{/* Selected Cell */}")
const selectedCellEnd = source.indexOf("{/* Search Queries */}")
const selectedCellSection = source.slice(selectedCellStart, selectedCellEnd)

// Find the Enrich button block
const enrichBtnStart = selectedCellSection.lastIndexOf(
  "<button",
  selectedCellSection.indexOf("Enrich"),
)
const enrichBtnEnd = selectedCellSection.indexOf("</button>", enrichBtnStart)
const enrichBtn = selectedCellSection.slice(enrichBtnStart, enrichBtnEnd)

// ============================================================
// When a cell has 0 leads, the Enrich button must be disabled.
// cellLeadStats?.total defaults to 0 when undefined (loading)
// or when the query returns total: 0 (no leads in cell).
// ============================================================

test("Enrich button disabled condition checks cellLeadStats total equals zero", () => {
  assert.ok(enrichBtn, "Should find Enrich button in Selected Cell section")
  assert.ok(
    enrichBtn.includes("(cellLeadStats?.total ?? 0) === 0"),
    "disabled condition should evaluate (cellLeadStats?.total ?? 0) === 0",
  )
})

test("Enrich button disabled attribute combines isEnriching with zero-leads check", () => {
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.match(
    enrichBtn,
    /disabled=\{isEnriching \|\| \(cellLeadStats\?\.total \?\? 0\) === 0\}/,
    "disabled attr should be: isEnriching || (cellLeadStats?.total ?? 0) === 0",
  )
})

test("Enrich button applies opacity-50 and cursor-not-allowed when disabled", () => {
  assert.ok(enrichBtn, "Should find Enrich button")
  // The className ternary should apply disabled styling when condition is true
  assert.ok(
    enrichBtn.includes('"opacity-50 cursor-not-allowed"'),
    "Disabled state should apply opacity-50 cursor-not-allowed",
  )
})

test("cellLeadStats query uses optional chaining with nullish coalesce to 0", () => {
  // Ensures the default when cellLeadStats is undefined (loading) is 0, which disables the button
  assert.match(
    source,
    /cellLeadStats\?\.total \?\? 0/,
    "Should use cellLeadStats?.total ?? 0 pattern for safe default",
  )
})
