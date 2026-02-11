import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

test("imports Rectangle and Tooltip from react-leaflet", () => {
  assert.match(source, /import\s+\{[\s\S]*Rectangle[\s\S]*\}\s+from\s+"react-leaflet"/)
  assert.match(source, /import\s+\{[\s\S]*Tooltip[\s\S]*\}\s+from\s+"react-leaflet"/)
})

test("imports getCellColor from cell-colors", () => {
  assert.match(source, /import\s+\{.*getCellColor.*\}\s+from\s+["']\.\/cell-colors["']/)
})

test("exports CellData type", () => {
  assert.match(source, /export\s+type\s+CellData/)
})

test("CellData includes bounds fields", () => {
  assert.match(source, /swLat:\s*number/)
  assert.match(source, /swLng:\s*number/)
  assert.match(source, /neLat:\s*number/)
  assert.match(source, /neLng:\s*number/)
})

test("CellData includes status field with CellStatus type", () => {
  assert.match(source, /status:\s*CellStatus/)
})

test("CellData includes optional resultCount", () => {
  assert.match(source, /resultCount\?:\s*number/)
})

test("CellData includes optional querySaturation array", () => {
  assert.match(source, /querySaturation\?:\s*Array<\{\s*query:\s*string;\s*count:\s*number\s*\}>/)
})

test("accepts cells and onCellClick props", () => {
  assert.match(source, /cells:\s*CellData\[\]/)
  assert.match(source, /onCellClick:\s*\(cellId:\s*string\)\s*=>\s*void/)
})

test("renders Rectangle for each cell", () => {
  assert.match(source, /<Rectangle/)
  assert.match(source, /cells\.map\(/)
})

test("Rectangle receives bounds from cell coordinates", () => {
  assert.match(source, /\[cell\.swLat,\s*cell\.swLng\]/)
  assert.match(source, /\[cell\.neLat,\s*cell\.neLng\]/)
  assert.match(source, /bounds=\{bounds\}/)
})

test("Rectangle receives pathOptions from getCellColor", () => {
  assert.match(source, /getCellColor\(cell\.status\)/)
  assert.match(source, /pathOptions=\{pathOptions\}/)
})

test("Rectangle has click eventHandler calling onCellClick", () => {
  assert.match(source, /eventHandlers=\{/)
  assert.match(source, /click:\s*\(\)\s*=>\s*onCellClick\(cell\._id\)/)
})

test("Tooltip is nested inside Rectangle", () => {
  assert.match(source, /<Rectangle[\s\S]*<Tooltip>[\s\S]*<\/Tooltip>[\s\S]*<\/Rectangle>/)
})

test("tooltip shows Unsearched for unsearched cells", () => {
  assert.match(source, /["']unsearched["'].*["']Unsearched["']|["']Unsearched["'].*unsearched/)
})

test("tooltip shows Searching for searching cells", () => {
  assert.match(source, /searching.*Searching|Searching.*searching/)
})

test("tooltip shows result count for searched cells", () => {
  assert.match(source, /resultCount/)
  assert.match(source, /results/)
})

test("tooltip shows saturated query info for saturated cells", () => {
  assert.match(source, /saturated/)
  assert.match(source, /querySaturation/)
  assert.match(source, /count\s*>=\s*60/)
})

test("filters querySaturation for queries at 60 capacity", () => {
  assert.match(source, /\.filter\(/)
  assert.match(source, /qs\.count\s*>=\s*60/)
})

test("exports DiscoveryGrid as default export", () => {
  assert.match(source, /export\s+default\s+function\s+DiscoveryGrid/)
})

test("uses use client directive", () => {
  assert.match(source, /^["']use client["']/)
})
