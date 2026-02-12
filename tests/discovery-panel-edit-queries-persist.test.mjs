import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")
const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")
const discoverCellSource = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8")

// --- Persistence: updateGridQueries writes queries to DB ---

test("updateGridQueries mutation accepts gridId and queries array args", () => {
  assert.match(gridCellsSource, /updateGridQueries\s*=\s*mutation\(\{/)
  assert.match(gridCellsSource, /gridId:\s*v\.id\("discoveryGrids"\)/)
  assert.match(gridCellsSource, /queries:\s*v\.array\(v\.string\(\)\)/)
})

test("updateGridQueries patches grid document with new queries", () => {
  assert.match(gridCellsSource, /ctx\.db\.patch\(args\.gridId,\s*\{\s*queries:\s*args\.queries\s*\}\)/)
})

test("updateGridQueries throws ConvexError when grid not found", () => {
  assert.match(gridCellsSource, /updateGridQueries[\s\S]*?Grid not found/)
})

// --- Read-back: listGrids returns updated queries ---

test("listGrids returns queries field from grid", () => {
  assert.match(gridCellsSource, /listGrids[\s\S]*?queries:\s*grid\.queries/)
})

// --- Panel reads and displays persisted queries ---

test("panel reads grids via listGrids query", () => {
  assert.match(panelSource, /useQuery\(api\.discovery\.gridCells\.listGrids\)/)
})

test("panel derives selectedGrid from grids by globalGridId", () => {
  assert.match(panelSource, /grids\?\.find\(\(g\)\s*=>\s*g\._id\s*===\s*globalGridId\)/)
})

test("panel iterates selectedGrid.queries to render badges", () => {
  assert.match(panelSource, /selectedGrid\.queries\.map\(\(query\)/)
})

// --- GridWithStats type includes queries field ---

test("GridWithStats type includes queries field", () => {
  assert.match(panelSource, /type\s+GridWithStats[\s\S]*?queries:\s*string\[\]/)
})

// --- Add query round-trip: handleAddQuery → updateGridQueries ---

test("handleAddQuery spreads existing queries and appends trimmed value", () => {
  assert.match(panelSource, /\[\.\.\.selectedGrid\.queries,\s*trimmed\]/)
})

test("handleAddQuery calls updateGridQueries with gridId", () => {
  assert.match(panelSource, /handleAddQuery[\s\S]*?updateGridQueries\(\{[\s\S]*?gridId:\s*selectedGrid\._id/)
})

test("handleAddQuery prevents duplicate queries", () => {
  assert.match(panelSource, /selectedGrid\.queries\.includes\(trimmed\)/)
})

// --- Edit query round-trip: handleSaveEdit → updateGridQueries ---

test("handleSaveEdit maps queries replacing old value with trimmed", () => {
  assert.match(panelSource, /selectedGrid\.queries\.map\(\(q\)\s*=>\s*q\s*===\s*editingQuery\s*\?\s*trimmed\s*:\s*q\)/)
})

test("handleSaveEdit calls updateGridQueries to persist edit", () => {
  assert.match(panelSource, /handleSaveEdit[\s\S]*?updateGridQueries\(\{/)
})

// --- Remove query round-trip: handleRemoveQuery → updateGridQueries ---

test("handleRemoveQuery filters out the removed query", () => {
  assert.match(panelSource, /selectedGrid\.queries\.filter\(\(q\)\s*=>\s*q\s*!==\s*queryToRemove\)/)
})

test("handleRemoveQuery calls updateGridQueries with gridId", () => {
  assert.match(panelSource, /handleRemoveQuery[\s\S]*?updateGridQueries\(\{[\s\S]*?gridId:\s*selectedGrid\._id/)
})

// --- Downstream persistence: discoverCell reads updated queries ---

test("discoverCell reads queries from grid data", () => {
  assert.match(discoverCellSource, /queries[\s\S]*?=[\s\S]*?\.grid/)
})

test("discoverCell maps over queries to search each one", () => {
  assert.match(discoverCellSource, /queries\.map\(async\s*\(query\)/)
})

// --- Panel uses useMutation hook for updateGridQueries ---

test("panel initializes updateGridQueries mutation hook", () => {
  assert.match(panelSource, /useMutation\(api\.discovery\.gridCells\.updateGridQueries\)/)
})
