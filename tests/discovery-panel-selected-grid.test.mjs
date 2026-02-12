import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// --- selectedGrid derivation ---

test("selectedGrid finds grid matching globalGridId", () => {
  assert.match(source, /grids\?\.find\(\(g\)\s*=>\s*g\._id\s*===\s*globalGridId\)/)
})

test("selectedGrid falls back to null (not first grid) when no match", () => {
  // Must end with `?? null`, NOT `?? grids?.[0] ?? null`
  assert.match(source, /grids\?\.find\(\(g\)\s*=>\s*g\._id\s*===\s*globalGridId\)\s*\?\?\s*null/)
})

test("selectedGrid does not fall back to grids[0]", () => {
  // The old pattern was: grids?.find(...) ?? grids?.[0] ?? null
  // After the change, we should NOT have grids?.[0] in the selectedGrid line
  const selectedGridLine = source.match(/const\s+selectedGrid\s*=\s*.+/)
  assert.ok(selectedGridLine, "selectedGrid declaration should exist")
  assert.doesNotMatch(selectedGridLine[0], /grids\?\.\[0\]/)
})

test("auto-select useEffect is removed (page component handles via getOrCreateGlobalGrid)", () => {
  // The page component now handles grid selection, so the panel should not auto-select
  assert.doesNotMatch(source, /!globalGridId\s*&&\s*grids\s*&&\s*grids\.length\s*>\s*0/)
  assert.doesNotMatch(source, /setGlobalGridId\(grids\[0\]\._id\)/)
})
