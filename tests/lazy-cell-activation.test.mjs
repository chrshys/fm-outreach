import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// handleCellAction: lazy activation of virtual cells
// ============================================================

test("handleCellAction uses let for cell variable", () => {
  assert.match(
    source,
    /let\s+cell\s*=\s*cells\?\s*\.find\(\(c[^)]*\)\s*=>\s*c\._id\s*===\s*cellId\)/,
  )
})

test("handleCellAction checks selectedVirtualCell when cell not found", () => {
  assert.match(
    source,
    /if\s*\(\s*!cell\s*&&\s*selectedVirtualCell\s*&&\s*selectedVirtualCell\.key\s*===\s*cellId\s*\)/,
  )
})

test("handleCellAction calls handleActivateCell with selectedVirtualCell", () => {
  assert.match(
    source,
    /const\s+newCellId\s*=\s*await\s+handleActivateCell\(selectedVirtualCell\)/,
  )
})

test("handleCellAction sets selectedVirtualCell to null after activation", () => {
  assert.match(
    source,
    /handleActivateCell\(selectedVirtualCell\)[\s\S]*?setSelectedVirtualCell\(null\)/,
  )
})

test("handleCellAction sets selectedCellId to newCellId after activation", () => {
  assert.match(
    source,
    /setSelectedVirtualCell\(null\)[\s\S]*?setSelectedCellId\(newCellId\)/,
  )
})

test("handleCellAction reassigns cellId to newCellId", () => {
  assert.match(
    source,
    /setSelectedCellId\(newCellId\)[\s\S]*?cellId\s*=\s*newCellId/,
  )
})

test("handleCellAction constructs synthetic cell with _id from newCellId", () => {
  assert.match(
    source,
    /cell\s*=\s*\{[^}]*_id:\s*newCellId/,
  )
})

test("handleCellAction synthetic cell has bounds from selectedVirtualCell", () => {
  assert.match(
    source,
    /cell\s*=\s*\{[^}]*swLat:\s*selectedVirtualCell\.swLat[^}]*swLng:\s*selectedVirtualCell\.swLng[^}]*neLat:\s*selectedVirtualCell\.neLat[^}]*neLng:\s*selectedVirtualCell\.neLng/,
  )
})

test("handleCellAction synthetic cell has depth 0", () => {
  assert.match(
    source,
    /cell\s*=\s*\{[^}]*depth:\s*0/,
  )
})

test("handleCellAction synthetic cell has status unsearched", () => {
  assert.match(
    source,
    /cell\s*=\s*\{[^}]*status:\s*"unsearched"/,
  )
})

test("handleCellAction synthetic cell has boundsKey from selectedVirtualCell.key", () => {
  assert.match(
    source,
    /cell\s*=\s*\{[^}]*boundsKey:\s*selectedVirtualCell\.key/,
  )
})

test("handleCellAction wraps activation in try/catch", () => {
  // The activation block should be inside a try/catch
  assert.match(
    source,
    /try\s*\{[\s\S]*?handleActivateCell\(selectedVirtualCell\)[\s\S]*?\}\s*catch\s*\(err\)/,
  )
})

test("handleCellAction shows toast.error on activation failure", () => {
  assert.match(
    source,
    /catch\s*\(err\)\s*\{[\s\S]*?toast\.error\(err instanceof Error \? err\.message : "Failed to activate cell"\)/,
  )
})

test("handleCellAction returns after activation failure", () => {
  assert.match(
    source,
    /toast\.error\(err instanceof Error \? err\.message : "Failed to activate cell"\)[\s\S]*?return/,
  )
})

test("handleCellAction dependency array includes selectedVirtualCell", () => {
  const match = source.match(
    /handleCellAction\s*=\s*useCallback\([\s\S]*?\},\s*\[([^\]]*)\]\)/,
  )
  assert.ok(match, "handleCellAction should have a deps array")
  assert.match(match[1], /selectedVirtualCell/, "should depend on selectedVirtualCell")
})

test("handleCellAction dependency array includes handleActivateCell", () => {
  const match = source.match(
    /handleCellAction\s*=\s*useCallback\([\s\S]*?\},\s*\[([^\]]*)\]\)/,
  )
  assert.ok(match, "handleCellAction should have a deps array")
  assert.match(match[1], /handleActivateCell/, "should depend on handleActivateCell")
})

// ============================================================
// activateCellMutation wiring
// ============================================================

test("declares activateCellMutation with useMutation", () => {
  assert.match(
    source,
    /const\s+activateCellMutation\s*=\s*useMutation\(api\.discovery\.gridCells\.activateCell\)/,
  )
})
