import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

test("imports Rectangle from react-leaflet", () => {
  assert.match(source, /import\s+\{[\s\S]*Rectangle[\s\S]*\}\s+from\s+"react-leaflet"/)
})

test("does NOT import Tooltip from react-leaflet", () => {
  assert.doesNotMatch(source, /Tooltip/)
})

test("does NOT import useMap from react-leaflet", () => {
  assert.doesNotMatch(source, /useMap/)
})

test("does NOT import leaflet L", () => {
  assert.doesNotMatch(source, /import\s+L\s+from\s+["']leaflet["']/)
})

test("does NOT import lucide-react icons", () => {
  assert.doesNotMatch(source, /from\s+["']lucide-react["']/)
})

test("does NOT import useCallback, useEffect, useRef, or useState from react", () => {
  assert.doesNotMatch(source, /import\s+\{[^}]*useCallback[^}]*\}\s+from\s+["']react["']/)
  assert.doesNotMatch(source, /import\s+\{[^}]*useEffect[^}]*\}\s+from\s+["']react["']/)
  assert.doesNotMatch(source, /import\s+\{[^}]*useRef[^}]*\}\s+from\s+["']react["']/)
  assert.doesNotMatch(source, /import\s+\{[^}]*useState[^}]*\}\s+from\s+["']react["']/)
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

test("accepts cells, selectedCellId, and onCellSelect props", () => {
  assert.match(source, /cells:\s*CellData\[\]/)
  assert.match(source, /selectedCellId:\s*string\s*\|\s*null/)
  assert.match(source, /onCellSelect:\s*\(cellId:\s*string\s*\|\s*null\)\s*=>\s*void/)
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
  assert.match(source, /pathOptions=\{/)
})

test("Rectangle has click event handler", () => {
  assert.match(source, /eventHandlers=\{\{/)
  assert.match(source, /click:/)
})

test("DiscoveryGridCell is not exported", () => {
  assert.doesNotMatch(source, /export\s+function\s+DiscoveryGridCell/)
})

test("exports DiscoveryGrid as default export", () => {
  assert.match(source, /export\s+default\s+function\s+DiscoveryGrid/)
})

test("uses use client directive", () => {
  assert.match(source, /^["']use client["']/)
})
