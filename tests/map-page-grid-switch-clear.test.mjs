import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

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
