import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// Extract the CellData type block (from declaration to next type definition)
const typeStart = source.indexOf("export type CellData = {")
const nextType = source.indexOf("\ntype ", typeStart + 1)
const cellDataBlock =
  typeStart !== -1 && nextType !== -1
    ? source.slice(typeStart, nextType).trim()
    : ""

test("CellData type exists in discovery-grid.tsx", () => {
  assert.ok(cellDataBlock.length > 0, "CellData type should be defined")
})

test("CellData has parentCellId as optional string", () => {
  assert.match(cellDataBlock, /parentCellId\?:\s*string/)
})

test("CellData still has all required fields", () => {
  assert.match(cellDataBlock, /_id:\s*string/)
  assert.match(cellDataBlock, /swLat:\s*number/)
  assert.match(cellDataBlock, /swLng:\s*number/)
  assert.match(cellDataBlock, /neLat:\s*number/)
  assert.match(cellDataBlock, /neLng:\s*number/)
  assert.match(cellDataBlock, /depth:\s*number/)
  assert.match(cellDataBlock, /status:\s*CellStatus/)
})

test("CellData still has optional fields", () => {
  assert.match(cellDataBlock, /resultCount\?:\s*number/)
  assert.match(cellDataBlock, /lastSearchedAt\?:\s*number/)
})
