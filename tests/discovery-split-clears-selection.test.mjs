import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
)

// ============================================================
// End-to-end: Clicking Split subdivides the cell, selection clears
// ============================================================

// --- Step 1: Panel Split button dispatches subdivide action ---

test("panel Split button calls onCellAction with subdivide type", () => {
  assert.match(
    panelSource,
    /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"subdivide"\s*\}\)/,
  )
})

test("panel Split button has Grid2x2Plus icon and 'Split' label", () => {
  assert.match(panelSource, /<Grid2x2Plus/)
  assert.match(panelSource, /Split/)
})

test("panel Split button is disabled at MAX_DEPTH or while searching", () => {
  assert.match(
    panelSource,
    /selectedCell\.depth\s*>=\s*MAX_DEPTH\s*\|\|\s*selectedCell\.status\s*===\s*"searching"/,
  )
})

// --- Step 2: Page handler calls subdivideCell mutation ---

test("handleCellAction calls subdivideCell mutation on subdivide action", () => {
  const subdivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(subdivideBlock, /await\s+subdivideCell\(\{/)
})

test("handleCellAction checks depth guard before calling subdivideCell", () => {
  const subdivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(subdivideBlock, /cell\.depth\s*>=\s*4/)
})

// --- Step 3: Backend subdivideCell splits into 4 quadrants ---

test("subdivideCell creates 4 child cells at midpoint", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const subdivideCell"),
    gridCellsSource.indexOf("export const undivideCell"),
  )
  assert.match(fnBlock, /midLat\s*=\s*\(cell\.swLat\s*\+\s*cell\.neLat\)\s*\/\s*2/)
  assert.match(fnBlock, /midLng\s*=\s*\(cell\.swLng\s*\+\s*cell\.neLng\)\s*\/\s*2/)
  assert.match(fnBlock, /childDepth\s*=\s*cell\.depth\s*\+\s*1/)
})

test("subdivideCell marks parent cell as non-leaf", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const subdivideCell"),
    gridCellsSource.indexOf("export const undivideCell"),
  )
  assert.match(fnBlock, /patch\(args\.cellId,\s*\{\s*isLeaf:\s*false\s*\}\)/)
})

test("subdivideCell creates children with isLeaf true and unsearched status", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const subdivideCell"),
    gridCellsSource.indexOf("export const undivideCell"),
  )
  assert.match(fnBlock, /isLeaf:\s*true/)
  assert.match(fnBlock, /status:\s*"unsearched"/)
})

test("subdivideCell refuses to split a searching cell", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const subdivideCell"),
    gridCellsSource.indexOf("export const undivideCell"),
  )
  assert.match(fnBlock, /cell\.status\s*===\s*"searching"/)
  assert.match(fnBlock, /Cannot subdivide while cell is being searched/)
})

test("subdivideCell refuses to split beyond MAX_DEPTH", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const subdivideCell"),
    gridCellsSource.indexOf("export const undivideCell"),
  )
  assert.match(fnBlock, /cell\.depth\s*>=\s*MAX_DEPTH/)
  assert.match(fnBlock, /Cell is already at maximum depth/)
})

// --- Step 4: After successful split, selection clears ---

test("handleCellAction calls setSelectedCellId(null) after successful subdivide", () => {
  const subdivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(subdivideBlock, /setSelectedCellId\(null\)/)
})

test("setSelectedCellId(null) comes after the success toast for subdivide", () => {
  const subdivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )
  const toastIdx = subdivideBlock.indexOf('toast.success("Cell subdivided')
  const clearIdx = subdivideBlock.indexOf("setSelectedCellId(null)")
  assert.ok(toastIdx >= 0, "subdivide success toast should exist")
  assert.ok(clearIdx >= 0, "setSelectedCellId(null) should exist")
  assert.ok(
    clearIdx > toastIdx,
    "selection should clear after success toast, not before",
  )
})

// --- Step 5: Success and error toasts ---

test("success toast shown after subdivide", () => {
  assert.match(pageSource, /toast\.success\("Cell subdivided into 4 quadrants"\)/)
})

test("error toast shown when subdivide fails", () => {
  assert.match(
    pageSource,
    /toast\.error\(err instanceof Error \? err\.message : "Failed to subdivide cell"\)/,
  )
})

test("info toast shown when cell is already at max depth", () => {
  assert.match(
    pageSource,
    /toast\.info\("Cell is already at maximum depth"\)/,
  )
})

// --- Step 6: listCells only returns leaf cells (split parent disappears) ---

test("listCells query filters by isLeaf true so split parent disappears from map", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const listCells"),
    gridCellsSource.indexOf("export const claimCellForSearch"),
  )
  assert.match(fnBlock, /by_gridId_isLeaf/)
  assert.match(fnBlock, /\.eq\("isLeaf",\s*true\)/)
})
