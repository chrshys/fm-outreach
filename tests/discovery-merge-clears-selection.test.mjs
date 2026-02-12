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
// End-to-end: Clicking Merge collapses siblings, selection clears
// ============================================================

// --- Step 1: Panel Merge button dispatches undivide action ---

test("panel Merge button calls onCellAction with undivide type", () => {
  assert.match(
    panelSource,
    /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"undivide"\s*\}\)/,
  )
})

test("panel Merge button has Minimize2 icon and 'Merge' label", () => {
  assert.match(panelSource, /<Minimize2/)
  assert.match(panelSource, /Merge/)
})

test("panel Merge button is only shown when cell depth > 0", () => {
  assert.match(panelSource, /selectedCell\.depth\s*>\s*0/)
})

test("panel Merge button is disabled while searching", () => {
  assert.match(
    panelSource,
    /selectedCell\.status\s*===\s*"searching"/,
  )
})

// --- Step 2: Page handler calls undivideCell mutation ---

test("handleCellAction calls undivideCell mutation on undivide action", () => {
  const undivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(undivideBlock, /await\s+undivideCell\(\{/)
})

test("undivideCell mutation is wired via useMutation", () => {
  assert.match(
    pageSource,
    /useMutation\(api\.discovery\.gridCells\.undivideCell\)/,
  )
})

// --- Step 3: Backend undivideCell BFS-deletes descendants and restores parent ---

test("undivideCell BFS-walks descendants via by_parentCellId index", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const undivideCell"),
    gridCellsSource.indexOf("export const listCells"),
  )
  assert.match(fnBlock, /by_parentCellId/)
  assert.match(fnBlock, /queue/)
})

test("undivideCell deletes collected descendants", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const undivideCell"),
    gridCellsSource.indexOf("export const listCells"),
  )
  assert.match(fnBlock, /ctx\.db\.delete/)
})

test("undivideCell patches parent to isLeaf true", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const undivideCell"),
    gridCellsSource.indexOf("export const listCells"),
  )
  assert.match(fnBlock, /isLeaf:\s*true/)
})

test("undivideCell blocks when any descendant is searching", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const undivideCell"),
    gridCellsSource.indexOf("export const listCells"),
  )
  assert.match(fnBlock, /status\s*===\s*"searching"/)
  assert.match(fnBlock, /Cannot undivide while a child cell is being searched/)
})

test("undivideCell returns deletedCount", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const undivideCell"),
    gridCellsSource.indexOf("export const listCells"),
  )
  assert.match(fnBlock, /deletedCount/)
})

// --- Step 4: After successful merge, selection clears ---

test("handleCellAction calls setSelectedCellId(null) after successful undivide", () => {
  const undivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(undivideBlock, /setSelectedCellId\(null\)/)
})

test("setSelectedCellId(null) comes after the success toast for undivide", () => {
  const undivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "undivide"'),
  )
  const toastIdx = undivideBlock.indexOf('toast.success("Cell merged')
  const clearIdx = undivideBlock.indexOf("setSelectedCellId(null)")
  assert.ok(toastIdx >= 0, "undivide success toast should exist")
  assert.ok(clearIdx >= 0, "setSelectedCellId(null) should exist")
  assert.ok(
    clearIdx > toastIdx,
    "selection should clear after success toast, not before",
  )
})

// --- Step 5: Success and error toasts ---

test("success toast shown after merge", () => {
  assert.match(pageSource, /toast\.success\("Cell merged back to parent"\)/)
})

test("error toast shown when merge fails", () => {
  assert.match(
    pageSource,
    /toast\.error\(err instanceof Error \? err\.message : "Failed to merge cell"\)/,
  )
})

// --- Step 6: listCells only returns leaf cells (merged parent reappears) ---

test("listCells query filters by isLeaf true so merged parent reappears on map", () => {
  const fnBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const listCells"),
    gridCellsSource.indexOf("export const claimCellForSearch"),
  )
  assert.match(fnBlock, /by_gridId_isLeaf/)
  assert.match(fnBlock, /\.eq\("isLeaf",\s*true\)/)
})
