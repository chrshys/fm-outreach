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

test("imports useMap and useMapEvents from react-leaflet", () => {
  assert.match(source, /import\s+\{[\s\S]*useMap[\s\S]*\}\s+from\s+"react-leaflet"/)
  assert.match(source, /import\s+\{[\s\S]*useMapEvents[\s\S]*\}\s+from\s+"react-leaflet"/)
})

test("does NOT import leaflet L", () => {
  assert.doesNotMatch(source, /import\s+L\s+from\s+["']leaflet["']/)
})

test("does NOT import lucide-react icons", () => {
  assert.doesNotMatch(source, /from\s+["']lucide-react["']/)
})

test("imports useState, useMemo, useCallback from react", () => {
  assert.match(source, /import\s+\{[^}]*useState[^}]*\}\s+from\s+["']react["']/)
  assert.match(source, /import\s+\{[^}]*useMemo[^}]*\}\s+from\s+["']react["']/)
  assert.match(source, /import\s+\{[^}]*useCallback[^}]*\}\s+from\s+["']react["']/)
})

test("does NOT import useEffect or useRef from react", () => {
  assert.doesNotMatch(source, /import\s+\{[^}]*useEffect[^}]*\}\s+from\s+["']react["']/)
  assert.doesNotMatch(source, /import\s+\{[^}]*useRef[^}]*\}\s+from\s+["']react["']/)
})

test("imports getCellColor and VIRTUAL_CELL_STYLE from cell-colors", () => {
  assert.match(source, /import\s+\{.*getCellColor.*\}\s+from\s+["']\.\/cell-colors["']/)
  assert.match(source, /import\s+\{.*VIRTUAL_CELL_STYLE.*\}\s+from\s+["']\.\/cell-colors["']/)
})

test("imports computeVirtualGrid from @/lib/virtual-grid", () => {
  assert.match(source, /import\s+\{\s*computeVirtualGrid\s*\}\s+from\s+["']@\/lib\/virtual-grid["']/)
})

test("imports VirtualCell type from @/lib/virtual-grid", () => {
  assert.match(source, /import\s+type\s+\{\s*VirtualCell\s*\}\s+from\s+["']@\/lib\/virtual-grid["']/)
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

test("DiscoveryGridProps includes cellSizeKm: number", () => {
  assert.match(source, /cellSizeKm:\s*number/)
})

test("DiscoveryGridProps includes gridId: string", () => {
  assert.match(source, /gridId:\s*string/)
})

test("DiscoveryGridProps includes activatedBoundsKeys: string[]", () => {
  assert.match(source, /activatedBoundsKeys:\s*string\[\]/)
})

test("DiscoveryGridProps includes onActivateCell returning Promise<string>", () => {
  assert.match(source, /onActivateCell:\s*\(cell:\s*VirtualCell\)\s*=>\s*Promise<string>/)
})

test("DiscoveryGrid destructures new props", () => {
  assert.match(source, /cellSizeKm/)
  assert.match(source, /gridId/)
  assert.match(source, /activatedBoundsKeys/)
  assert.match(source, /onActivateCell/)
})
