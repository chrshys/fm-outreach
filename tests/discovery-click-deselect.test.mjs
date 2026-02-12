import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// Clicking the same cell again deselects it
// ============================================================

// --- DiscoveryGridCell toggle logic ---

test("DiscoveryGridCell click handler is a ternary toggling between null and cell._id", () => {
  const cellFnMatch = gridSource.match(/^function\s+DiscoveryGridCell[\s\S]*?^}/m)
  assert.ok(cellFnMatch, "DiscoveryGridCell function not found")
  // When isSelected is true the handler passes null (deselect),
  // otherwise it passes cell._id (select)
  assert.match(
    cellFnMatch[0],
    /click:\s*\(\)\s*=>\s*onCellSelect\(isSelected\s*\?\s*null\s*:\s*cell\._id\)/,
  )
})

test("DiscoveryGridCell derives isSelected from props (not internal state)", () => {
  // Ensure isSelected comes from the destructured props, not from useState
  assert.match(gridSource, /\{\s*cell,\s*isSelected,\s*onCellSelect\s*\}/)
  assert.doesNotMatch(
    gridSource.slice(
      gridSource.indexOf("function DiscoveryGridCell"),
      gridSource.indexOf("export default function DiscoveryGrid"),
    ),
    /useState/,
  )
})

// --- Page wiring: handleCellSelect accepts null ---

test("handleCellSelect parameter type allows null (cellId: string | null)", () => {
  assert.match(
    pageSource,
    /handleCellSelect\s*=\s*useCallback\(\(cellId:\s*string\s*\|\s*null\)/,
  )
})

test("handleCellSelect calls setSelectedCellId with the received value", () => {
  const fnMatch = pageSource.match(
    /handleCellSelect\s*=\s*useCallback\([\s\S]*?\),\s*\[/,
  )
  assert.ok(fnMatch, "handleCellSelect not found")
  assert.match(fnMatch[0], /setSelectedCellId\(cellId\)/)
})

// --- Panel hides cell detail when no cell selected ---

test("discovery panel only renders selected cell section when selectedCell exists", () => {
  const panelSource = fs.readFileSync(
    "src/components/map/discovery-panel.tsx",
    "utf8",
  )
  assert.match(panelSource, /selectedCell\s*&&/)
})

// --- useEffect resets selection when grid changes ---

test("selectedCellId resets to null when globalGridId changes", () => {
  assert.match(
    pageSource,
    /useEffect\(\(\)\s*=>\s*\{[^}]*setSelectedCellId\(null\)[^}]*\},\s*\[globalGridId,\s*setSelectedCellId\]\)/,
  )
})
