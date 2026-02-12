import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// useEffect clears selection when globalGridId changes
// ============================================================

test("imports useEffect from react", () => {
  assert.match(source, /import\s+\{[^}]*useEffect[^}]*\}\s+from\s+"react"/)
})

test("has a useEffect that clears selectedCellId and selectedVirtualCell when globalGridId changes", () => {
  assert.match(
    source,
    /useEffect\(\(\)\s*=>\s*\{\s*setSelectedCellId\(null\);\s*setSelectedVirtualCell\(null\)\s*\},\s*\[globalGridId\]\)/,
  )
})

test("does not have a handleGridSelect callback (removed in favor of setGlobalGridId)", () => {
  assert.ok(
    !source.includes("handleGridSelect"),
    "handleGridSelect should be removed — useEffect on globalGridId handles cell clearing",
  )
})

test("does not pass setGlobalGridId to DiscoveryPanel (auto-select removed)", () => {
  assert.doesNotMatch(source, /setGlobalGridId=\{setGlobalGridId\}/)
})

// ============================================================
// View mode toggle clears selection
// ============================================================

test("view mode toggle button calls setSelectedCellId(null)", () => {
  // Find the onClick handler for the view mode toggle that sets viewMode
  const toggleMatch = source.match(
    /onClick=\{\(\)\s*=>\s*\{[^}]*setViewMode\([\s\S]*?\}\}/,
  )
  assert.ok(toggleMatch, "view mode toggle onClick should exist")
  const handler = toggleMatch[0]
  assert.match(handler, /setSelectedCellId\(null\)/, "view mode toggle should clear selectedCellId")
})
