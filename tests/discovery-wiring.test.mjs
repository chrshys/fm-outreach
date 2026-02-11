import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// --- Map page: discovery queries ---

test("imports toast from sonner in map page", () => {
  assert.match(pageSource, /import\s+\{\s*toast\s*\}\s+from\s+["']sonner["']/)
})

test("imports Id type from Convex dataModel", () => {
  assert.match(pageSource, /import\s+type\s+\{\s*Id\s*\}\s+from\s+["']\.\.\/\.\.\/\.\.\/convex\/_generated\/dataModel["']/)
})

test("has selectedGridId state with Id<discoveryGrids> type", () => {
  assert.match(pageSource, /useState<Id<"discoveryGrids">\s*\|\s*null>\(null\)/)
})

test("queries listCells conditionally on selectedGridId and discovery viewMode", () => {
  assert.match(pageSource, /useQuery\(\s*api\.discovery\.gridCells\.listCells/)
  assert.match(pageSource, /selectedGridId\s*&&\s*viewMode\s*===\s*"discovery"/)
  assert.match(pageSource, /gridId:\s*selectedGridId/)
  assert.match(pageSource, /:\s*"skip"/)
})

test("uses requestDiscoverCell mutation", () => {
  assert.match(pageSource, /useMutation\(api\.discovery\.discoverCell\.requestDiscoverCell\)/)
})

test("uses subdivideCell mutation", () => {
  assert.match(pageSource, /useMutation\(api\.discovery\.gridCells\.subdivideCell\)/)
})

// --- handleCellClick ---

test("defines handleCellClick callback", () => {
  assert.match(pageSource, /handleCellClick\s*=\s*useCallback\(async\s*\(cellId:\s*string\)/)
})

test("handleCellClick looks up cell from gridCells", () => {
  assert.match(pageSource, /gridCells\?\s*\.find\(\(c\)\s*=>\s*c\._id\s*===\s*cellId\)/)
})

test("handleCellClick shows info toast for searching status", () => {
  assert.match(pageSource, /cell\.status\s*===\s*"searching"/)
  assert.match(pageSource, /toast\.info\("Search already in progress"\)/)
})

test("handleCellClick calls requestDiscoverCell for unsearched cells", () => {
  assert.match(pageSource, /cell\.status\s*===\s*"unsearched"\s*\|\|\s*cell\.status\s*===\s*"searched"/)
  assert.match(pageSource, /requestDiscoverCell\(\{/)
})

test("handleCellClick shows success toast on discover", () => {
  assert.match(pageSource, /toast\.success\("Discovery started for cell"\)/)
})

test("handleCellClick calls subdivideCell for saturated cells", () => {
  assert.match(pageSource, /cell\.status\s*===\s*"saturated"/)
  assert.match(pageSource, /subdivideCell\(\{/)
})

test("handleCellClick shows success toast on subdivide", () => {
  assert.match(pageSource, /toast\.success\("Cell subdivided into 4 quadrants"\)/)
})

test("handleCellClick has try/catch for discover with error toast", () => {
  assert.match(pageSource, /toast\.error\(err instanceof Error \? err\.message : "Failed to discover cell"\)/)
})

test("handleCellClick has try/catch for subdivide with error toast", () => {
  assert.match(pageSource, /toast\.error\(err instanceof Error \? err\.message : "Failed to subdivide cell"\)/)
})

// --- MapContent receives gridCells and onCellClick ---

test("passes gridCells to MapContent in discovery mode", () => {
  assert.match(pageSource, /gridCells=\{viewMode\s*===\s*"discovery"\s*\?\s*gridCells\s*\?\?\s*undefined\s*:\s*undefined\}/)
})

test("passes onCellClick to MapContent in discovery mode", () => {
  assert.match(pageSource, /onCellClick=\{viewMode\s*===\s*"discovery"\s*\?\s*handleCellClick\s*:\s*undefined\}/)
})

// --- DiscoveryPanel receives selectedGridId and onGridSelect ---

test("passes selectedGridId to DiscoveryPanel", () => {
  assert.match(pageSource, /selectedGridId=\{selectedGridId\}/)
})

test("passes onGridSelect to DiscoveryPanel", () => {
  assert.match(pageSource, /onGridSelect=\{setSelectedGridId\}/)
})

// --- DiscoveryPanel prop types ---

test("DiscoveryPanel accepts selectedGridId prop", () => {
  assert.match(panelSource, /selectedGridId:\s*Id<"discoveryGrids">\s*\|\s*null/)
})

test("DiscoveryPanel accepts onGridSelect prop", () => {
  assert.match(panelSource, /onGridSelect:\s*\(gridId:\s*Id<"discoveryGrids">\)\s*=>\s*void/)
})

test("DiscoveryPanel destructures selectedGridId and onGridSelect", () => {
  assert.match(panelSource, /\{\s*mapBounds,\s*selectedGridId,\s*onGridSelect\s*\}/)
})

test("DiscoveryPanel calls onGridSelect on auto-select", () => {
  assert.match(panelSource, /if\s*\(!selectedGridId\s*&&\s*grids\s*&&\s*grids\.length\s*>\s*0\)\s*\{\s*\n\s*onGridSelect\(grids\[0\]\._id\)/)
})

test("DiscoveryPanel calls onGridSelect on grid creation", () => {
  assert.match(panelSource, /onGridSelect\(result\.gridId\s+as\s+Id<"discoveryGrids">\)/)
})

test("DiscoveryPanel calls onGridSelect on grid selector click", () => {
  assert.match(panelSource, /onGridSelect\(grid\._id\)/)
})
