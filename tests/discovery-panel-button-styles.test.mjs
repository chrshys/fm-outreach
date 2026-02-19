import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)

// Extract only the selected cell section for scoped assertions
const selectedCellStart = panelSource.indexOf("{/* Selected Cell */}")
const selectedCellEnd = panelSource.indexOf("{/* Search Queries */}")
const selectedCellSection = panelSource.slice(selectedCellStart, selectedCellEnd)

// Base button style that all selected-cell buttons must use
const BASE_STYLE = "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs"
const HOVER_STYLE = "hover:bg-accent"
const TRANSITION = "transition-colors"
const DISABLED_STYLE = "opacity-50 cursor-not-allowed"

// Extract all <button ...> ... </button> blocks from the selected cell section
function extractButtonBlocks(source) {
  const blocks = []
  let idx = 0
  while (true) {
    const start = source.indexOf("<button", idx)
    if (start === -1) break
    const end = source.indexOf("</button>", start)
    if (end === -1) break
    blocks.push(source.slice(start, end + "</button>".length))
    idx = end + "</button>".length
  }
  return blocks
}

const buttonBlocks = extractButtonBlocks(selectedCellSection)

// ============================================================
// All buttons in the selected cell section use consistent base styles
// ============================================================

test("selected cell section has exactly 4 button types (Run, Split, Merge, Enrich)", () => {
  const runButtons = buttonBlocks.filter((b) => b.includes(">Run<") || b.match(/>\s*Run\s*</))
  const splitButtons = buttonBlocks.filter((b) => b.includes("Split"))
  const mergeButtons = buttonBlocks.filter((b) => b.includes("Merge"))
  const enrichButtons = buttonBlocks.filter((b) => b.includes("Enrich"))
  assert.ok(runButtons.length >= 1, "Should find at least one Run button")
  assert.ok(splitButtons.length === 1, "Should find exactly one Split button")
  assert.ok(mergeButtons.length === 1, "Should find exactly one Merge button")
  assert.ok(enrichButtons.length === 1, "Should find exactly one Enrich button")
})

test("Run button has consistent base style", () => {
  const runBtn = buttonBlocks.find((b) => />\s*Run\s*</.test(b))
  assert.ok(runBtn, "Should find Run button")
  assert.ok(runBtn.includes(BASE_STYLE), `Run button should include base style`)
  assert.ok(runBtn.includes(TRANSITION), `Run button should include transition-colors`)
})

test("Split button has consistent base style", () => {
  const splitBtn = buttonBlocks.find((b) => b.includes("Split"))
  assert.ok(splitBtn, "Should find Split button")
  assert.ok(splitBtn.includes(BASE_STYLE), `Split button should include base style`)
  assert.ok(splitBtn.includes(TRANSITION), `Split button should include transition-colors`)
})

test("Merge button has consistent base style", () => {
  const mergeBtn = buttonBlocks.find((b) => b.includes("Merge"))
  assert.ok(mergeBtn, "Should find Merge button")
  assert.ok(mergeBtn.includes(BASE_STYLE), `Merge button should include base style`)
  assert.ok(mergeBtn.includes(TRANSITION), `Merge button should include transition-colors`)
})

test("Enrich button has consistent base style", () => {
  const enrichBtn = buttonBlocks.find((b) => b.includes("Enrich"))
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.ok(enrichBtn.includes(BASE_STYLE), `Enrich button should include base style`)
  assert.ok(enrichBtn.includes(TRANSITION), `Enrich button should include transition-colors`)
})

// ============================================================
// Disabled buttons get opacity-50 cursor-not-allowed
// ============================================================

test("Run button applies disabled style (opacity-50 cursor-not-allowed) when disabled", () => {
  const runBtn = buttonBlocks.find((b) => />\s*Run\s*</.test(b))
  assert.ok(runBtn, "Should find Run button")
  assert.ok(runBtn.includes(DISABLED_STYLE), `Run button should include disabled style`)
})

test("Split button applies disabled style when disabled", () => {
  const splitBtn = buttonBlocks.find((b) => b.includes("Split"))
  assert.ok(splitBtn, "Should find Split button")
  assert.ok(splitBtn.includes(DISABLED_STYLE), `Split button should include disabled style`)
})

test("Merge button applies disabled style when disabled", () => {
  const mergeBtn = buttonBlocks.find((b) => b.includes("Merge"))
  assert.ok(mergeBtn, "Should find Merge button")
  assert.ok(mergeBtn.includes(DISABLED_STYLE), `Merge button should include disabled style`)
})

test("Enrich button applies disabled style when disabled", () => {
  const enrichBtn = buttonBlocks.find((b) => b.includes("Enrich"))
  assert.ok(enrichBtn, "Should find Enrich button")
  assert.ok(enrichBtn.includes(DISABLED_STYLE), `Enrich button should include disabled style`)
})

// ============================================================
// Enabled buttons get hover:bg-accent
// ============================================================

test("All selected-cell buttons include hover:bg-accent when enabled", () => {
  assert.ok(buttonBlocks.length >= 4, `Should find at least 4 buttons, found ${buttonBlocks.length}`)
  for (const block of buttonBlocks) {
    assert.ok(block.includes(HOVER_STYLE), `Button should include hover:bg-accent`)
  }
})

// ============================================================
// No stopPropagation in selected cell buttons
// ============================================================

test("selected cell buttons do not use stopPropagation", () => {
  assert.ok(!selectedCellSection.includes("stopPropagation"), "Selected cell section should not use stopPropagation")
})

// ============================================================
// Disabled style is only on buttons, not parent row wrappers
// ============================================================

test("mechanism row wrapper does not apply opacity-50 (only button does)", () => {
  const mechanismRows = [...panelSource.matchAll(/<div key=\{mechanism\.id\} className="([^"]+)">/g)]
  assert.ok(mechanismRows.length > 0, "Should find mechanism row divs")
  for (const match of mechanismRows) {
    const cls = match[1]
    assert.ok(!cls.includes("opacity-50"), `Mechanism row should not have opacity-50, got: ${cls}`)
  }
})
