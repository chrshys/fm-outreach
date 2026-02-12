import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// handleActivateCell callback structure
// ============================================================

test("declares handleActivateCell with useCallback", () => {
  assert.match(
    source,
    /const\s+handleActivateCell\s*=\s*useCallback\(/,
  )
})

test("handleActivateCell accepts cell with inline type { key, swLat, swLng, neLat, neLng }", () => {
  assert.match(
    source,
    /handleActivateCell\s*=\s*useCallback\(\s*async\s+\(cell:\s*\{\s*key:\s*string[,;]\s*swLat:\s*number[,;]\s*swLng:\s*number[,;]\s*neLat:\s*number[,;]\s*neLng:\s*number\s*\}\)/,
  )
})

test("handleActivateCell returns empty string when globalGridId is falsy", () => {
  assert.match(
    source,
    /handleActivateCell[\s\S]*?if\s*\(\s*!globalGridId\s*\)\s*return\s*""/,
  )
})

test("handleActivateCell calls activateCellMutation with correct args", () => {
  assert.match(
    source,
    /handleActivateCell[\s\S]*?activateCellMutation\(\{[\s\S]*?gridId:\s*globalGridId[\s\S]*?swLat:\s*cell\.swLat[\s\S]*?swLng:\s*cell\.swLng[\s\S]*?neLat:\s*cell\.neLat[\s\S]*?neLng:\s*cell\.neLng[\s\S]*?boundsKey:\s*cell\.key[\s\S]*?\}\)/,
  )
})

test("handleActivateCell returns result.cellId", () => {
  assert.match(
    source,
    /handleActivateCell[\s\S]*?return\s+result\.cellId/,
  )
})

test("handleActivateCell depends on globalGridId and activateCellMutation", () => {
  const match = source.match(
    /handleActivateCell\s*=\s*useCallback\([\s\S]*?\},\s*\[([^\]]*)\]\)/,
  )
  assert.ok(match, "handleActivateCell useCallback should have a deps array")
  const deps = match[1]
  assert.match(deps, /globalGridId/, "should depend on globalGridId")
  assert.match(deps, /activateCellMutation/, "should depend on activateCellMutation")
})

test("imports VirtualCell type for virtual cell state", () => {
  assert.match(
    source,
    /import\s+type\s+\{\s*VirtualCell\s*\}\s+from/,
  )
})
