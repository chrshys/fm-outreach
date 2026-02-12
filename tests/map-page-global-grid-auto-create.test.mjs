import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// globalGridId state replaces selectedGridId
// ============================================================

test("declares globalGridId state with correct type", () => {
  assert.match(
    source,
    /useMapStore\(\(s\)\s*=>\s*s\.globalGridId\)/,
  )
})

test("does not declare selectedGridId state", () => {
  assert.doesNotMatch(
    source,
    /const\s+\[selectedGridId,\s*setSelectedGridId\]/,
  )
})

// ============================================================
// Auto-create useEffect calls getOrCreateGlobalGrid
// ============================================================

test("has a useEffect that calls getOrCreateGlobalGrid when viewMode is discovery and globalGridId is null", () => {
  // Match the useEffect that checks both conditions and calls getOrCreateGlobalGrid
  assert.match(
    source,
    /useEffect\(\(\)\s*=>\s*\{[\s\S]*?viewMode\s*===\s*"discovery"\s*&&\s*globalGridId\s*===\s*null[\s\S]*?getOrCreateGlobalGrid\(\{?\}?\)[\s\S]*?\},\s*\[/,
  )
})

test("auto-create useEffect sets globalGridId from result", () => {
  assert.match(
    source,
    /getOrCreateGlobalGrid\(\{\}\)\.then\(\(result\)\s*=>\s*\{[\s\S]*?setGlobalGridId\(result\.gridId\)/,
  )
})

test("auto-create useEffect has correct dependencies", () => {
  // Find the auto-create useEffect and check its deps array
  const effectMatch = source.match(
    /\/\/ Auto-create global grid[\s\S]*?useEffect\([\s\S]*?\},\s*\[([^\]]*)\]\)/,
  )
  assert.ok(effectMatch, "auto-create useEffect should exist")
  const deps = effectMatch[1]
  assert.match(deps, /viewMode/, "should depend on viewMode")
  assert.match(deps, /globalGridId/, "should depend on globalGridId")
  assert.match(deps, /getOrCreateGlobalGrid/, "should depend on getOrCreateGlobalGrid")
})

test("auto-create useEffect appears after getOrCreateGlobalGrid mutation declaration", () => {
  const mutationIndex = source.indexOf("const getOrCreateGlobalGrid = useMutation(")
  const effectIndex = source.indexOf("// Auto-create global grid")
  assert.ok(mutationIndex > 0, "getOrCreateGlobalGrid mutation should be declared")
  assert.ok(effectIndex > 0, "auto-create useEffect should exist")
  assert.ok(
    effectIndex > mutationIndex,
    "auto-create useEffect should appear after mutation declaration",
  )
})

// ============================================================
// DiscoveryPanel receives globalGridId prop
// ============================================================

test("passes globalGridId to DiscoveryPanel as globalGridId prop", () => {
  assert.match(
    source,
    /DiscoveryPanel[\s\S]*?globalGridId=\{globalGridId\}/,
  )
})
