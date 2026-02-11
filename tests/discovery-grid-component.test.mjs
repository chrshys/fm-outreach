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

test("accepts cells and onCellAction props", () => {
  assert.match(source, /cells:\s*CellData\[\]/)
  assert.match(source, /onCellAction:\s*\(cellId:\s*string,\s*action:\s*CellAction\)\s*=>\s*void/)
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

test("Rectangle has click eventHandler calling onCellAction", () => {
  assert.match(source, /eventHandlers=\{/)
  assert.match(source, /click:\s*\(\)\s*=>\s*onCellAction\(cell\._id/)
})

test("Tooltip is interactive and nested inside Rectangle", () => {
  assert.match(source, /<Rectangle[\s\S]*<Tooltip\s+interactive>[\s\S]*<\/Tooltip>[\s\S]*<\/Rectangle>/)
})

test("Tooltip renders CellTooltipContent component", () => {
  assert.match(source, /<CellTooltipContent\s+cell=\{cell\}\s+onCellAction=\{onCellAction\}/)
})

test("CellTooltipContent shows status badge with label", () => {
  assert.match(source, /cell\.status\.charAt\(0\)\.toUpperCase\(\)/)
})

test("CellTooltipContent shows result count", () => {
  assert.match(source, /resultCount/)
  assert.match(source, /results/)
})

test("CellTooltipContent renders DISCOVERY_MECHANISMS rows", () => {
  assert.match(source, /DISCOVERY_MECHANISMS\.map\(/)
  assert.match(source, /mechanism\.label/)
})

test("mechanism Run button calls onCellAction with search action", () => {
  assert.match(source, /onCellAction\(cell\._id,\s*\{\s*type:\s*"search",\s*mechanism:\s*mechanism\.id\s*\}\)/)
})

test("Run button is disabled when mechanism not enabled or cell is searching", () => {
  assert.match(source, /!mechanism\.enabled\s*\|\|\s*isSearching/)
  assert.match(source, /opacity-50 pointer-events-none/)
})

test("exports DiscoveryGrid as default export", () => {
  assert.match(source, /export\s+default\s+function\s+DiscoveryGrid/)
})

test("uses use client directive", () => {
  assert.match(source, /^["']use client["']/)
})
