import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

const sharedSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
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

test("re-exports CellData type from discovery-grid-shared", () => {
  assert.match(source, /export\s+type\s+\{[^}]*CellData[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})

test("CellData includes bounds fields (in shared module)", () => {
  assert.match(sharedSource, /swLat:\s*number/)
  assert.match(sharedSource, /swLng:\s*number/)
  assert.match(sharedSource, /neLat:\s*number/)
  assert.match(sharedSource, /neLng:\s*number/)
})

test("CellData includes status field with CellStatus type (in shared module)", () => {
  assert.match(sharedSource, /status:\s*CellStatus/)
})

test("CellData includes optional resultCount (in shared module)", () => {
  assert.match(sharedSource, /resultCount\?:\s*number/)
})

test("CellData includes optional querySaturation array (in shared module)", () => {
  assert.match(sharedSource, /querySaturation\?:\s*Array<\{\s*query:\s*string;\s*count:\s*number\s*\}>/)
})

test("CellData includes optional boundsKey (in shared module)", () => {
  assert.match(sharedSource, /boundsKey\?:\s*string/)
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

// --- Virtual grid integration tests ---

test("DiscoveryGrid calls useMap()", () => {
  assert.match(source, /const\s+map\s*=\s*useMap\(\)/)
})

test("DiscoveryGrid has mapBounds state", () => {
  assert.match(source, /useState<\{\s*swLat:\s*number;\s*swLng:\s*number;\s*neLat:\s*number;\s*neLng:\s*number\s*\}>/)
})

test("DiscoveryGrid defines updateBounds with useCallback", () => {
  assert.match(source, /const\s+updateBounds\s*=\s*useCallback\(/)
  assert.match(source, /map\.getBounds\(\)/)
  assert.match(source, /getSouth\(\)/)
  assert.match(source, /getWest\(\)/)
  assert.match(source, /getNorth\(\)/)
  assert.match(source, /getEast\(\)/)
})

test("DiscoveryGrid uses useMapEvents for moveend and zoomend", () => {
  assert.match(source, /useMapEvents\(\{/)
  assert.match(source, /moveend:\s*\(\)\s*=>\s*updateBounds\(\)/)
  assert.match(source, /zoomend:\s*\(\)\s*=>\s*updateBounds\(\)/)
})

test("DiscoveryGrid initializes mapBounds eagerly via useState initializer", () => {
  assert.match(source, /useState.*\(\(\)\s*=>\s*getMapBounds\(map\)\)/)
})

test("DiscoveryGrid computes virtualCells with useMemo", () => {
  assert.match(source, /const\s+virtualCells\s*=\s*useMemo\(/)
  assert.match(source, /map\.getZoom\(\)\s*<\s*8/)
  assert.match(source, /computeVirtualGrid\(mapBounds,\s*cellSizeKm\)/)
})

test("DiscoveryGrid builds activatedSet from activatedBoundsKeys", () => {
  assert.match(source, /const\s+activatedSet\s*=\s*useMemo\(\(\)\s*=>\s*new\s+Set\(activatedBoundsKeys\)/)
})

test("DiscoveryGrid builds persistedBoundsKeySet from cells", () => {
  assert.match(source, /const\s+persistedBoundsKeySet\s*=\s*useMemo\(/)
  assert.match(source, /cells\.map\(.*boundsKey/)
})

test("DiscoveryGrid filters virtual cells against both sets", () => {
  assert.match(source, /const\s+filteredVirtualCells\s*=\s*useMemo\(/)
  assert.match(source, /!activatedSet\.has\(vc\.key\)/)
  assert.match(source, /!persistedBoundsKeySet\.has\(vc\.key\)/)
})

test("DiscoveryGrid renders VirtualGridCell for filtered virtual cells", () => {
  assert.match(source, /filteredVirtualCells\.map\(/)
  assert.match(source, /<VirtualGridCell/)
})
