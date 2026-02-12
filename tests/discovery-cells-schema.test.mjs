import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8")

// Extract the discoveryCells table block for scoped assertions
const cellsBlock = schemaSource.slice(
  schemaSource.indexOf("discoveryCells: defineTable("),
)

test("discoveryCells table exists in schema", () => {
  assert.match(schemaSource, /discoveryCells:\s*defineTable\(\{/)
})

// Bounding box fields
test("has swLat field as v.number()", () => {
  assert.match(cellsBlock, /swLat:\s*v\.number\(\)/)
})

test("has swLng field as v.number()", () => {
  assert.match(cellsBlock, /swLng:\s*v\.number\(\)/)
})

test("has neLat field as v.number()", () => {
  assert.match(cellsBlock, /neLat:\s*v\.number\(\)/)
})

test("has neLng field as v.number()", () => {
  assert.match(cellsBlock, /neLng:\s*v\.number\(\)/)
})

// Depth field
test("has depth field as v.number()", () => {
  assert.match(cellsBlock, /depth:\s*v\.number\(\)/)
})

// Parent cell reference
test("has parentCellId as optional id referencing discoveryCells", () => {
  assert.match(
    cellsBlock,
    /parentCellId:\s*v\.optional\(v\.id\("discoveryCells"\)\)/,
  )
})

// isLeaf boolean
test("has isLeaf field as v.boolean()", () => {
  assert.match(cellsBlock, /isLeaf:\s*v\.boolean\(\)/)
})

// Status union with all four values
test("has status as union of unsearched, searched, saturated, searching", () => {
  assert.match(cellsBlock, /status:\s*v\.union\(/)
  assert.match(cellsBlock, /v\.literal\("unsearched"\)/)
  assert.match(cellsBlock, /v\.literal\("searched"\)/)
  assert.match(cellsBlock, /v\.literal\("saturated"\)/)
  assert.match(cellsBlock, /v\.literal\("searching"\)/)
})

// resultCount
test("has resultCount as optional number", () => {
  assert.match(cellsBlock, /resultCount:\s*v\.optional\(v\.number\(\)\)/)
})

// querySaturation
test("has querySaturation as optional array of {query, count} objects", () => {
  assert.match(
    cellsBlock,
    /querySaturation:\s*v\.optional\(\s*v\.array\(v\.object\(\{\s*query:\s*v\.string\(\),\s*count:\s*v\.number\(\)\s*\}\)\)/,
  )
})

// lastSearchedAt
test("has lastSearchedAt as optional number", () => {
  assert.match(cellsBlock, /lastSearchedAt:\s*v\.optional\(v\.number\(\)\)/)
})

// gridId foreign key
test("has gridId referencing discoveryGrids", () => {
  assert.match(cellsBlock, /gridId:\s*v\.id\("discoveryGrids"\)/)
})

// boundsKey
test("has boundsKey field as v.string()", () => {
  assert.match(cellsBlock, /boundsKey:\s*v\.string\(\)/)
})

// Indexes
test("has by_gridId index on gridId", () => {
  assert.match(cellsBlock, /\.index\("by_gridId",\s*\["gridId"\]\)/)
})

test("has by_gridId_isLeaf index on gridId and isLeaf", () => {
  assert.match(
    cellsBlock,
    /\.index\("by_gridId_isLeaf",\s*\["gridId",\s*"isLeaf"\]\)/,
  )
})

test("has by_parentCellId index on parentCellId", () => {
  assert.match(
    cellsBlock,
    /\.index\("by_parentCellId",\s*\["parentCellId"\]\)/,
  )
})
