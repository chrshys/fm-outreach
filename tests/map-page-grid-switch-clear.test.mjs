import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// useEffect clears selection when selectedGridId changes
// ============================================================

test("imports useEffect from react", () => {
  assert.match(source, /import\s+\{[^}]*useEffect[^}]*\}\s+from\s+"react"/)
})

test("has a useEffect that clears selectedCellId when selectedGridId changes", () => {
  assert.match(
    source,
    /useEffect\(\(\)\s*=>\s*\{\s*setSelectedCellId\(null\)\s*\},\s*\[selectedGridId\]\)/,
  )
})

test("useEffect appears before handleGridSelect", () => {
  const effectIndex = source.indexOf("useEffect(() => { setSelectedCellId(null) }, [selectedGridId])")
  const handleGridSelectIndex = source.indexOf("const handleGridSelect = useCallback")
  assert.ok(effectIndex > 0, "useEffect should exist")
  assert.ok(handleGridSelectIndex > 0, "handleGridSelect should exist")
  assert.ok(
    effectIndex < handleGridSelectIndex,
    "useEffect should appear before handleGridSelect",
  )
})

// ============================================================
// handleGridSelect explicitly clears selection
// ============================================================

test("handleGridSelect calls setSelectedCellId(null)", () => {
  // Extract the handleGridSelect callback body
  const handleGridSelectMatch = source.match(
    /const handleGridSelect = useCallback\(\(gridId[^)]*\)\s*=>\s*\{([\s\S]*?)\},\s*\[/,
  )
  assert.ok(handleGridSelectMatch, "handleGridSelect should be a useCallback")
  const body = handleGridSelectMatch[1]
  assert.match(body, /setSelectedCellId\(null\)/, "handleGridSelect should clear selectedCellId")
  assert.match(body, /setSelectedGridId\(gridId\)/, "handleGridSelect should set the new grid id")
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
