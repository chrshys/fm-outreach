import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")

test("exports activateCell as a public mutation", () => {
  assert.match(source, /export const activateCell = mutation\(/)
})

test("activateCell accepts gridId, bounds coordinates, and boundsKey args", () => {
  assert.match(source, /gridId:\s*v\.id\("discoveryGrids"\)/)
  assert.match(source, /swLat:\s*v\.number\(\)/)
  assert.match(source, /swLng:\s*v\.number\(\)/)
  assert.match(source, /neLat:\s*v\.number\(\)/)
  assert.match(source, /neLng:\s*v\.number\(\)/)
  assert.match(source, /boundsKey:\s*v\.string\(\)/)
})

test("activateCell queries discoveryCells using by_gridId_boundsKey index", () => {
  assert.match(
    source,
    /\.query\("discoveryCells"\)\s*\.withIndex\("by_gridId_boundsKey"/s,
  )
  assert.match(
    source,
    /q\.eq\("gridId",\s*args\.gridId\)\.eq\("boundsKey",\s*args\.boundsKey\)/,
  )
  assert.match(source, /\.first\(\)/)
})

test("activateCell returns existing cell id when cell already exists", () => {
  assert.match(source, /cellId:\s*existing\._id,\s*alreadyExisted:\s*true/)
})

test("activateCell inserts new discoveryCells document with correct defaults when not found", () => {
  assert.match(source, /ctx\.db\.insert\("discoveryCells",\s*\{/)
  // Verify default field values
  assert.match(source, /depth:\s*0/)
  assert.match(source, /isLeaf:\s*true/)
  assert.match(source, /status:\s*"unsearched"/)
  assert.match(source, /gridId:\s*args\.gridId/)
  assert.match(source, /boundsKey:\s*args\.boundsKey/)
})

test("activateCell returns new cell id when cell is created", () => {
  assert.match(source, /cellId,\s*alreadyExisted:\s*false/)
})
