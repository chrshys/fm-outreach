import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// Extract the selected cell section for scoped assertions
const selectedCellStart = source.indexOf("{/* Selected Cell */}")
const selectedCellEnd = source.indexOf("{/* Search Queries */}")
const selectedCellSection = source.slice(selectedCellStart, selectedCellEnd)

// Extract the Enrich button block
function extractButtonBlocks(src) {
  const blocks = []
  let idx = 0
  while (true) {
    const start = src.indexOf("<button", idx)
    if (start === -1) break
    const end = src.indexOf("</button>", start)
    if (end === -1) break
    blocks.push(src.slice(start, end + "</button>".length))
    idx = end + "</button>".length
  }
  return blocks
}

const buttonBlocks = extractButtonBlocks(selectedCellSection)
const enrichBtn = buttonBlocks.find((b) => b.includes("Enrich"))

// ============================================================
// Enrich button exists in selected cell section
// ============================================================

test("Enrich button exists in the Selected Cell section", () => {
  assert.ok(enrichBtn, "Should find an Enrich button in the selected cell section")
})

// ============================================================
// Enrich button uses Sparkles icon with size-3
// ============================================================

test("Enrich button uses Sparkles icon with size-3", () => {
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.match(enrichBtn, /Sparkles\s+className="size-3"/)
})

// ============================================================
// Enrich button calls handleEnrichCell on click
// ============================================================

test("Enrich button calls handleEnrichCell on click", () => {
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.ok(enrichBtn.includes("onClick={handleEnrichCell}"), "Enrich button should call handleEnrichCell")
})

// ============================================================
// Enrich button disabled conditions
// ============================================================

test("Enrich button is disabled when isEnriching", () => {
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.ok(enrichBtn.includes("isEnriching"), "Enrich button disabled condition should include isEnriching")
})

test("Enrich button is disabled when !persistedCell (virtual cells)", () => {
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.ok(enrichBtn.includes("!persistedCell"), "Enrich button disabled condition should include !persistedCell")
})

test("Enrich button is disabled when no leads in cell", () => {
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.ok(
    enrichBtn.includes("(cellLeadStats?.total ?? 0) === 0"),
    "Enrich button disabled condition should check (cellLeadStats?.total ?? 0) === 0",
  )
})

test("Enrich button disabled attribute includes all three conditions", () => {
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.match(
    enrichBtn,
    /disabled=\{isEnriching \|\| !persistedCell \|\| \(cellLeadStats\?\.total \?\? 0\) === 0\}/,
  )
})

// ============================================================
// Enrich button shows "Enriching..." when isEnriching
// ============================================================

test("Enrich button shows 'Enriching...' text when isEnriching", () => {
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.ok(enrichBtn.includes('"Enriching..."'), "Enrich button should show 'Enriching...' when isEnriching")
})

test("Enrich button shows 'Enrich' text when not enriching", () => {
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.match(enrichBtn, /isEnriching \? "Enriching\.\.\." : "Enrich"/)
})
