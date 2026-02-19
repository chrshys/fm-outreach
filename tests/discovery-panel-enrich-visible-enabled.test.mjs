import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// ============================================================
// Enrich button is inside the selectedCell conditional block
// — visible only when a cell is selected
// ============================================================

test("Enrich button is only rendered when selectedCell is truthy", () => {
  // The Selected Cell section guard should come before the Enrich button in JSX
  const selectedCellSection = source.indexOf("{/* Selected Cell */}")
  const selectedCellGuard = source.indexOf("selectedCell && (", selectedCellSection)
  // Look for the onClick usage in JSX, not the callback definition
  const enrichButton = source.indexOf("onClick={handleEnrichCell}")
  assert.ok(selectedCellGuard !== -1, "selectedCell conditional block should exist")
  assert.ok(enrichButton !== -1, "Enrich button onClick should exist")
  assert.ok(
    selectedCellGuard < enrichButton,
    "selectedCell conditional should wrap the Enrich button",
  )
})

// ============================================================
// cellLeadStats query fires for persisted cells
// — enables the button when leads exist
// ============================================================

test("cellLeadStats query is called with persistedCell._id", () => {
  assert.match(
    source,
    /useQuery\(\s*\n?\s*api\.discovery\.gridCells\.getCellLeadStats/,
    "Should call useQuery for getCellLeadStats",
  )
  assert.match(
    source,
    /persistedCell\s*\?\s*\{\s*cellId:\s*persistedCell\._id\s+as\s+Id<"discoveryCells">\s*\}\s*:\s*"skip"/,
    "Should pass cellId from persistedCell or skip",
  )
})

// ============================================================
// Enrich button enabled when: not enriching, persisted cell, has leads
// (positive case — all disabling conditions are false)
// ============================================================

test("Enrich button disabled attribute uses exactly three conditions", () => {
  // Extract the button's disabled attribute
  const selectedCellStart = source.indexOf("{/* Selected Cell */}")
  const selectedCellEnd = source.indexOf("{/* Search Queries */}")
  const section = source.slice(selectedCellStart, selectedCellEnd)

  // Find the disabled attribute on the enrich button
  const enrichBtnStart = section.lastIndexOf("<button", section.indexOf("Enrich"))
  const enrichBtnEnd = section.indexOf("</button>", enrichBtnStart)
  const enrichBtn = section.slice(enrichBtnStart, enrichBtnEnd)

  // The disabled condition should be exactly these three ORed conditions:
  // isEnriching || !persistedCell || (cellLeadStats?.total ?? 0) === 0
  // When a discovered cell (persistedCell exists) with leads (total > 0) is selected
  // and isEnriching is false, all three are false → button is enabled
  assert.match(
    enrichBtn,
    /disabled=\{isEnriching \|\| !persistedCell \|\| \(cellLeadStats\?\.total \?\? 0\) === 0\}/,
    "Button disabled only by isEnriching, !persistedCell, or zero leads",
  )
})

// ============================================================
// Enrich button className toggles hover:bg-accent when enabled
// ============================================================

test("Enrich button shows hover:bg-accent when enabled (not opacity-50)", () => {
  const selectedCellStart = source.indexOf("{/* Selected Cell */}")
  const selectedCellEnd = source.indexOf("{/* Search Queries */}")
  const section = source.slice(selectedCellStart, selectedCellEnd)

  const enrichBtnStart = section.lastIndexOf("<button", section.indexOf("Enrich"))
  const enrichBtnEnd = section.indexOf("</button>", enrichBtnStart)
  const enrichBtn = section.slice(enrichBtnStart, enrichBtnEnd)

  // The ternary for className should use the same condition as disabled
  // When enabled (conditions false) → "hover:bg-accent"
  // When disabled (conditions true) → "opacity-50 cursor-not-allowed"
  assert.ok(
    enrichBtn.includes('"hover:bg-accent"'),
    "Enabled state should apply hover:bg-accent class",
  )
  assert.ok(
    enrichBtn.includes('"opacity-50 cursor-not-allowed"'),
    "Disabled state should apply opacity-50 cursor-not-allowed class",
  )
})

// ============================================================
// Enrich button default text is "Enrich" (not "Enriching...")
// — confirming the button label for the non-enriching state
// ============================================================

test("Enrich button shows 'Enrich' label by default", () => {
  assert.match(
    source,
    /isEnriching \? "Enriching\.\.\." : "Enrich"/,
    "Button text should be 'Enrich' when not enriching",
  )
})
