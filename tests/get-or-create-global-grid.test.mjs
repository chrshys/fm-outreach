import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")

test("exports getOrCreateGlobalGrid as a public mutation", () => {
  assert.match(source, /export const getOrCreateGlobalGrid = mutation\(\{/)
})

test("getOrCreateGlobalGrid takes no args", () => {
  // Match args: {} inside getOrCreateGlobalGrid
  const fnBlock = source.slice(source.indexOf("getOrCreateGlobalGrid"))
  assert.match(fnBlock, /args:\s*\{\s*\}/)
})

test("queries all discoveryGrids documents", () => {
  const fnBlock = source.slice(source.indexOf("getOrCreateGlobalGrid"))
  assert.match(fnBlock, /ctx\.db\.query\("discoveryGrids"\)\.collect\(\)/)
})

test("returns existing grid with created: false", () => {
  const fnBlock = source.slice(source.indexOf("getOrCreateGlobalGrid"))
  assert.match(fnBlock, /\{\s*gridId:\s*grid\._id,\s*created:\s*false\s*\}/)
})

test("inserts new grid when none exist with correct fields", () => {
  const fnBlock = source.slice(source.indexOf("getOrCreateGlobalGrid"))
  assert.match(fnBlock, /ctx\.db\.insert\("discoveryGrids"/)
  assert.match(fnBlock, /name:\s*"Discovery"/)
  assert.match(fnBlock, /region:\s*"Ontario"/)
  assert.match(fnBlock, /province:\s*"Ontario"/)
  assert.match(fnBlock, /queries:\s*DEFAULT_QUERIES/)
  assert.match(fnBlock, /cellSizeKm:\s*DEFAULT_CELL_SIZE_KM/)
  assert.match(fnBlock, /totalLeadsFound:\s*0/)
  assert.match(fnBlock, /createdAt:\s*Date\.now\(\)/)
})

test("does not include bounds fields in inserted grid", () => {
  const fnBlock = source.slice(
    source.indexOf("getOrCreateGlobalGrid"),
    source.indexOf("updateCellSearchResult")
  )
  // The insert call should not contain swLat, swLng, neLat, neLng
  const insertBlock = fnBlock.slice(fnBlock.indexOf("ctx.db.insert"))
  const closingParen = insertBlock.indexOf("});")
  const insertArgs = insertBlock.slice(0, closingParen)
  assert.doesNotMatch(insertArgs, /swLat/)
  assert.doesNotMatch(insertArgs, /swLng/)
  assert.doesNotMatch(insertArgs, /neLat/)
  assert.doesNotMatch(insertArgs, /neLng/)
})

test("returns created: true for new grid", () => {
  const fnBlock = source.slice(source.indexOf("getOrCreateGlobalGrid"))
  assert.match(fnBlock, /\{\s*gridId.*,\s*created:\s*true\s*\}/)
})

test("DEFAULT_QUERIES is defined as an array of strings", () => {
  assert.match(source, /const DEFAULT_QUERIES\s*=\s*\[/)
})

test("DEFAULT_CELL_SIZE_KM is defined as a number", () => {
  assert.match(source, /const DEFAULT_CELL_SIZE_KM\s*=\s*\d+/)
})
