import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// All existing cell actions (search, split, merge) still work from the panel
// ============================================================

// --- Panel receives onCellAction prop ---

test("DiscoveryPanel accepts onCellAction prop in its type definition", () => {
  assert.match(
    panelSource,
    /onCellAction:\s*\(cellId:\s*string,\s*action:\s*CellAction\)\s*=>\s*void/,
  )
})

// --- Search action: Run buttons for each discovery mechanism ---

test("panel renders a Run button for each DISCOVERY_MECHANISM", () => {
  assert.match(panelSource, /DISCOVERY_MECHANISMS\.map\(/)
  assert.match(panelSource, /Run/)
})

test("panel search button dispatches search action with mechanism id", () => {
  assert.match(
    panelSource,
    /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"search",\s*mechanism:\s*mechanism\.id\s*\}\)/,
  )
})

test("panel search button is disabled when cell is searching", () => {
  assert.match(panelSource, /selectedCell\.status\s*===\s*"searching"/)
})

test("panel search button uses Play icon", () => {
  assert.match(panelSource, /<Play\s/)
})

// --- Split action: subdivide button ---

test("panel renders Split button with Grid2x2Plus icon", () => {
  assert.match(panelSource, /<Grid2x2Plus/)
  assert.match(panelSource, /Split/)
})

test("panel Split button dispatches subdivide action", () => {
  assert.match(
    panelSource,
    /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"subdivide"\s*\}\)/,
  )
})

test("panel Split button is disabled at MAX_DEPTH", () => {
  assert.match(panelSource, /selectedCell\.depth\s*>=\s*MAX_DEPTH/)
})

test("panel Split button is disabled while searching", () => {
  const splitButtonBlock = panelSource.slice(
    panelSource.indexOf('type: "subdivide"') - 200,
    panelSource.indexOf('type: "subdivide"'),
  )
  assert.match(splitButtonBlock, /selectedCell\.status\s*===\s*"searching"/)
})

// --- Merge action: undivide button ---

test("panel renders Merge button with Minimize2 icon", () => {
  assert.match(panelSource, /<Minimize2/)
  assert.match(panelSource, /Merge/)
})

test("panel Merge button dispatches undivide action", () => {
  assert.match(
    panelSource,
    /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"undivide"\s*\}\)/,
  )
})

test("panel Merge button only shown when depth > 0", () => {
  assert.match(panelSource, /selectedCell\.depth\s*>\s*0/)
})

test("panel Merge button is disabled while searching", () => {
  const mergeButtonBlock = panelSource.slice(
    panelSource.indexOf('type: "undivide"') - 200,
    panelSource.indexOf('type: "undivide"'),
  )
  assert.match(mergeButtonBlock, /selectedCell\.status\s*===\s*"searching"/)
})

// --- Page wires panel onCellAction to handleCellAction ---

test("page passes handleCellAction to DiscoveryPanel as onCellAction prop", () => {
  assert.match(pageSource, /onCellAction=\{handleCellAction\}/)
})

test("handleCellAction handles all three action types", () => {
  assert.match(pageSource, /action\.type\s*===\s*"search"/)
  assert.match(pageSource, /action\.type\s*===\s*"subdivide"/)
  assert.match(pageSource, /action\.type\s*===\s*"undivide"/)
})

test("handleCellAction calls requestDiscoverCell for search actions", () => {
  const searchBlock = pageSource.slice(
    pageSource.indexOf('action.type === "search"'),
    pageSource.indexOf('action.type === "subdivide"'),
  )
  assert.match(searchBlock, /requestDiscoverCell/)
})

test("handleCellAction calls subdivideCell for split actions", () => {
  const subdivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(subdivideBlock, /subdivideCell/)
})

test("handleCellAction calls undivideCell for merge actions", () => {
  const undivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(undivideBlock, /undivideCell/)
})
