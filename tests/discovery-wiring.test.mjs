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

test("has globalGridId state with Id<discoveryGrids> type", () => {
  assert.match(pageSource, /useState<Id<"discoveryGrids">\s*\|\s*null>\(null\)/)
})

test("queries listCells unconditionally on globalGridId (stays warm across mode switches)", () => {
  assert.match(pageSource, /useQuery\(\s*api\.discovery\.gridCells\.listCells/)
  assert.match(pageSource, /globalGridId\s*\?\s*\{\s*gridId:\s*globalGridId\s*\}\s*:\s*"skip"/)
})

test("uses requestDiscoverCell mutation", () => {
  assert.match(pageSource, /useMutation\(api\.discovery\.discoverCell\.requestDiscoverCell\)/)
})

test("uses subdivideCell mutation", () => {
  assert.match(pageSource, /useMutation\(api\.discovery\.gridCells\.subdivideCell\)/)
})

// --- handleCellAction ---

test("defines handleCellAction callback", () => {
  assert.match(pageSource, /handleCellAction\s*=\s*useCallback\(async\s*\(cellId:\s*string,\s*action:\s*CellAction\)/)
})

test("handleCellAction looks up cell from cells", () => {
  assert.match(pageSource, /cells\?\s*\.find\(\(c\)\s*=>\s*c\._id\s*===\s*cellId\)/)
})

test("handleCellAction shows info toast for searching status on search action", () => {
  assert.match(pageSource, /cell\.status\s*===\s*"searching"/)
  assert.match(pageSource, /toast\.info\("Search already in progress"\)/)
})

test("handleCellAction calls requestDiscoverCell for google_places mechanism", () => {
  assert.match(pageSource, /action\.mechanism\s*!==\s*"google_places"/)
  assert.match(pageSource, /requestDiscoverCell\(\{/)
})

test("handleCellAction shows success toast on discover", () => {
  assert.match(pageSource, /toast\.success\("Discovery started for cell"\)/)
})

test("handleCellAction dispatches on action.type for subdivide", () => {
  assert.match(pageSource, /action\.type\s*===\s*"subdivide"/)
  assert.match(pageSource, /subdivideCell\(\{/)
})

test("handleCellAction shows success toast on subdivide", () => {
  assert.match(pageSource, /toast\.success\("Cell subdivided into 4 quadrants"\)/)
})

test("handleCellAction has try/catch for discover with error toast", () => {
  assert.match(pageSource, /toast\.error\(err instanceof Error \? err\.message : "Failed to discover cell"\)/)
})

test("handleCellAction has try/catch for subdivide with error toast", () => {
  assert.match(pageSource, /toast\.error\(err instanceof Error \? err\.message : "Failed to subdivide cell"\)/)
})

// --- handleCellAction: undivide ---

test("handleCellAction dispatches on action.type for undivide", () => {
  assert.match(pageSource, /action\.type\s*===\s*"undivide"/)
  assert.match(pageSource, /undivideCell\(\{/)
})

test("handleCellAction shows success toast on undivide", () => {
  assert.match(pageSource, /toast\.success\("Cell merged back to parent"\)/)
})

test("handleCellAction has try/catch for undivide with error toast", () => {
  assert.match(pageSource, /toast\.error\(err instanceof Error \? err\.message : "Failed to merge cell"\)/)
})

test("handleCellAction dependency array includes undivideCell", () => {
  assert.match(pageSource, /\[cells,\s*requestDiscoverCell,\s*subdivideCell,\s*undivideCell\]/)
})

test("uses undivideCell mutation", () => {
  assert.match(pageSource, /useMutation\(api\.discovery\.gridCells\.undivideCell\)/)
})

// --- handleCellAction: non-google_places mechanism ---

test("handleCellAction shows Coming soon for non-google_places mechanism", () => {
  assert.match(pageSource, /action\.mechanism\s*!==\s*"google_places"/)
  assert.match(pageSource, /toast\.info\("Coming soon"\)/)
})

// --- MapContent receives gridCells, selectedCellId, and onCellSelect ---

test("passes gridCells to MapContent in discovery mode", () => {
  assert.match(pageSource, /gridCells=\{viewMode\s*===\s*"discovery"\s*\?\s*cells\s*\?\?\s*undefined\s*:\s*undefined\}/)
})

test("passes onCellSelect to MapContent in discovery mode", () => {
  assert.match(pageSource, /onCellSelect=\{viewMode\s*===\s*"discovery"\s*\?\s*handleCellSelect\s*:\s*undefined\}/)
})

// --- DiscoveryPanel receives globalGridId (setGlobalGridId removed) ---

test("passes globalGridId to DiscoveryPanel as globalGridId prop", () => {
  assert.match(pageSource, /globalGridId=\{globalGridId\}/)
})

test("does not pass setGlobalGridId to DiscoveryPanel (auto-select removed)", () => {
  assert.doesNotMatch(pageSource, /setGlobalGridId=\{setGlobalGridId\}/)
})

// --- DiscoveryPanel prop types ---

test("DiscoveryPanel accepts globalGridId prop", () => {
  assert.match(panelSource, /globalGridId:\s*Id<"discoveryGrids">\s*\|\s*null/)
})

test("DiscoveryPanel does not accept setGlobalGridId prop (auto-select removed)", () => {
  assert.doesNotMatch(panelSource, /setGlobalGridId/)
})

test("DiscoveryPanel destructures globalGridId without setGlobalGridId", () => {
  assert.match(panelSource, /\{\s*globalGridId,\s*cells,\s*selectedCellId,\s*onCellAction\s*\}/)
})

test("DiscoveryPanel does not call setGlobalGridId (auto-select removed)", () => {
  assert.doesNotMatch(panelSource, /setGlobalGridId/)
})
