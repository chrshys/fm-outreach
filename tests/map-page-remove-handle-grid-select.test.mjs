import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// handleGridSelect removed — setGlobalGridId passed directly
// ============================================================

test("does not define handleGridSelect callback", () => {
  assert.ok(
    !source.includes("const handleGridSelect"),
    "handleGridSelect should not be defined",
  )
})

test("does not reference handleGridSelect anywhere", () => {
  assert.ok(
    !source.includes("handleGridSelect"),
    "handleGridSelect should not appear in the source",
  )
})

test("passes setGlobalGridId directly to DiscoveryPanel as setGlobalGridId prop", () => {
  assert.match(source, /setGlobalGridId=\{setGlobalGridId\}/)
})

test("useEffect clears selectedCellId when globalGridId changes", () => {
  assert.match(
    source,
    /useEffect\(\(\)\s*=>\s*\{\s*setSelectedCellId\(null\)\s*\},\s*\[globalGridId\]\)/,
  )
})

test("useEffect on globalGridId appears before handleCellSelect", () => {
  const effectIndex = source.indexOf("useEffect(() => { setSelectedCellId(null) }, [globalGridId])")
  const cellSelectIndex = source.indexOf("const handleCellSelect")
  assert.ok(effectIndex > 0, "useEffect should exist")
  assert.ok(cellSelectIndex > 0, "handleCellSelect should exist")
  assert.ok(
    effectIndex < cellSelectIndex,
    "useEffect should appear before handleCellSelect",
  )
})
