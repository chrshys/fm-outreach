import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// CellTooltipContent component structure
// ============================================================

test("CellTooltipContent is a function component", () => {
  assert.match(source, /function\s+CellTooltipContent\(/)
})

test("CellTooltipContent accepts cell and onCellAction props", () => {
  assert.match(source, /cell:\s*CellData/)
  assert.match(source, /onCellAction:\s*\(cellId:\s*string,\s*action:\s*CellAction\)\s*=>\s*void/)
})

test("Tooltip is interactive with styled className", () => {
  assert.match(source, /<Tooltip/)
  assert.match(source, /interactive/)
  assert.match(source, /className="!bg-card !border !border-border !rounded-lg !shadow-md !px-2\.5 !py-2 !text-foreground"/)
})

test("CellTooltipContent is rendered inside Tooltip via hover wrapper", () => {
  assert.match(source, /<CellTooltipContent\s+cell=\{cell\}\s+onCellAction=\{onCellAction\}\s*\/>/)
})

// ============================================================
// Top line: status badge + result count
// ============================================================

test("renders status badge with capitalized label", () => {
  assert.match(source, /cell\.status\.charAt\(0\)\.toUpperCase\(\)/)
})

test("renders result count with fallback to 0", () => {
  assert.match(source, /cell\.resultCount\s*\?\?\s*0/)
  assert.match(source, /results/)
})

test("getStatusBadgeColor returns color classes for each status", () => {
  assert.match(source, /function\s+getStatusBadgeColor\(status:\s*CellStatus\)/)
  assert.match(source, /case\s*"unsearched"/)
  assert.match(source, /case\s*"searching"/)
  assert.match(source, /case\s*"searched"/)
  assert.match(source, /case\s*"saturated"/)
})

// ============================================================
// Mechanism rows section
// ============================================================

test("iterates over DISCOVERY_MECHANISMS to render rows", () => {
  assert.match(source, /DISCOVERY_MECHANISMS\.map\(\(mechanism\)/)
})

test("shows mechanism label in each row", () => {
  assert.match(source, /mechanism\.label/)
})

test("shows formatted short date for google_places using lastSearchedAt", () => {
  assert.match(source, /mechanism\.id\s*===\s*"google_places"\s*&&\s*cell\.lastSearchedAt/)
  assert.match(source, /formatShortDate\(cell\.lastSearchedAt\)/)
})

test("shows dash for mechanisms without last-run date", () => {
  // Non-google_places mechanisms show "—"
  assert.match(source, /:\s*"—"/)
})

test("formatShortDate formats timestamp as short date", () => {
  assert.match(source, /function\s+formatShortDate\(timestamp:\s*number\)/)
  assert.match(source, /toLocaleDateString\("en-US"/)
  assert.match(source, /month:\s*"short"/)
  assert.match(source, /day:\s*"numeric"/)
})

// ============================================================
// Run button per mechanism
// ============================================================

test("renders Play icon from lucide-react for Run button", () => {
  assert.match(source, /import\s+\{[\s\S]*Play[\s\S]*\}\s+from\s+"lucide-react"/)
  assert.match(source, /<Play\s+className="h-3 w-3"/)
})

test("Run button calls onCellAction with search type and mechanism id", () => {
  assert.match(source, /onCellAction\(cell\._id,\s*\{\s*type:\s*"search",\s*mechanism:\s*mechanism\.id\s*\}\)/)
})

test("Run button uses e.stopPropagation", () => {
  // All button clicks use stopPropagation
  const buttonBlocks = source.match(/onClick=\{\(e\)\s*=>\s*\{[^}]*e\.stopPropagation\(\)/g)
  assert.ok(buttonBlocks, "should have onClick handlers with stopPropagation")
  assert.ok(buttonBlocks.length >= 3, "should have at least 3 buttons with stopPropagation (Run, Split, Merge)")
})

test("Run button is disabled when mechanism not enabled or cell is searching", () => {
  assert.match(source, /!mechanism\.enabled\s*\|\|\s*isSearching/)
})

test("disabled Run button has opacity-50 and pointer-events-none", () => {
  assert.match(source, /opacity-50 pointer-events-none/)
})

// ============================================================
// Compact button styling
// ============================================================

test("Run button uses compact control styling", () => {
  assert.match(source, /inline-flex items-center gap-1 rounded-md border px-1\.5 py-0\.5 text-xs hover:bg-accent transition-colors/)
})

test("Split button uses compact control styling", () => {
  // Find the Split button in the onCellAction call
  const splitActionIdx = source.indexOf('onCellAction(cell._id, { type: "subdivide" })')
  assert.ok(splitActionIdx > 0, "should find subdivide action call")
  const beforeSplit = source.slice(0, splitActionIdx)
  const lastClassName = beforeSplit.lastIndexOf("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs hover:bg-accent transition-colors")
  assert.ok(lastClassName > 0, "Split button should have compact control styling")
})

test("Merge button uses compact control styling", () => {
  // Find the Merge button in the onCellAction call
  const mergeActionIdx = source.indexOf('onCellAction(cell._id, { type: "undivide" })')
  assert.ok(mergeActionIdx > 0, "should find undivide action call")
  const beforeMerge = source.slice(0, mergeActionIdx)
  const lastClassName = beforeMerge.lastIndexOf("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs hover:bg-accent transition-colors")
  assert.ok(lastClassName > 0, "Merge button should have compact control styling")
})

test("all tooltip buttons have border class for visual outline", () => {
  // Count occurrences of the compact button pattern - should be 3 (Run, Split, Merge)
  const matches = source.match(/inline-flex items-center gap-1 rounded-md border px-1\.5 py-0\.5 text-xs hover:bg-accent transition-colors/g)
  assert.ok(matches, "should find compact button styling")
  assert.equal(matches.length, 3, "all three buttons (Run, Split, Merge) should have compact styling")
})

test("all tooltip buttons have transition-colors for hover effect", () => {
  const matches = source.match(/transition-colors/g)
  assert.ok(matches, "should find transition-colors")
  assert.ok(matches.length >= 3, "at least 3 buttons should have transition-colors")
})

// ============================================================
// Split and Merge buttons (bottom row)
// ============================================================

test("imports Grid2x2Plus and Minimize2 from lucide-react", () => {
  assert.match(source, /import\s+\{[\s\S]*Grid2x2Plus[\s\S]*\}\s+from\s+"lucide-react"/)
  assert.match(source, /import\s+\{[\s\S]*Minimize2[\s\S]*\}\s+from\s+"lucide-react"/)
})

test("Split button renders Grid2x2Plus icon and 'Split' label", () => {
  assert.match(source, /<Grid2x2Plus\s+className="h-3 w-3"/)
  // The text "Split" appears after the icon
  const splitBlock = source.slice(source.indexOf("<Grid2x2Plus"))
  assert.match(splitBlock, /Split/)
})

test("Split button calls onCellAction with subdivide type", () => {
  assert.match(source, /onCellAction\(cell\._id,\s*\{\s*type:\s*"subdivide"\s*\}\)/)
})

test("Split button is hidden when cell depth >= MAX_DEPTH", () => {
  assert.match(source, /cell\.depth\s*<\s*MAX_DEPTH/)
})

test("Merge button renders Minimize2 icon and 'Merge' label", () => {
  assert.match(source, /<Minimize2\s+className="h-3 w-3"/)
  const mergeBlock = source.slice(source.indexOf("<Minimize2"))
  assert.match(mergeBlock, /Merge/)
})

test("Merge button calls onCellAction with undivide type", () => {
  assert.match(source, /onCellAction\(cell\._id,\s*\{\s*type:\s*"undivide"\s*\}\)/)
})

test("Merge button is hidden when cell has no parentCellId", () => {
  assert.match(source, /cell\.parentCellId/)
})

test("Split and Merge buttons are hidden entirely when cell is searching", () => {
  // The bottom row is wrapped in {!isSearching && (...)}
  assert.match(source, /!isSearching\s*&&/)
})

test("isSearching is derived from cell.status === searching", () => {
  assert.match(source, /const\s+isSearching\s*=\s*cell\.status\s*===\s*"searching"/)
})
