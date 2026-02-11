import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")

test("exports deleteCellBatch internalMutation that queries cells by gridId and deletes in batch", () => {
  assert.match(source, /export const deleteCellBatch = internalMutation\(/)
  assert.match(source, /gridId:\s*v\.id\("discoveryGrids"\)/)
  assert.match(source, /\.withIndex\("by_gridId",\s*\(q\)\s*=>\s*q\.eq\("gridId",\s*args\.gridId\)\)/)
  assert.match(source, /\.take\(DELETE_BATCH_SIZE\)/)
  assert.match(source, /await ctx\.db\.delete\(cell\._id\)/)
  assert.match(source, /return\s*\{\s*deleted:\s*cells\.length\s*\}/)
})

test("exports deleteGrid internalAction that loops deleteCellBatch until all cells removed", () => {
  assert.match(source, /export const deleteGrid = internalAction\(/)
  assert.match(source, /gridId:\s*v\.id\("discoveryGrids"\)/)
  assert.match(source, /while\s*\(!done\)/)
  assert.match(source, /internal\.discovery\.gridCells\.deleteCellBatch/)
  assert.match(source, /ctx\.runMutation\(\s*internal\.discovery\.gridCells\.deleteCellBatch/)
  assert.match(source, /if\s*\(deleted < DELETE_BATCH_SIZE\)/)
})

test("deleteGrid calls deleteGridRecord after all cells are deleted", () => {
  assert.match(source, /internal\.discovery\.gridCells\.deleteGridRecord/)
  assert.match(source, /ctx\.runMutation\(internal\.discovery\.gridCells\.deleteGridRecord/)
})

test("exports deleteGridRecord internalMutation that deletes the discoveryGrids record", () => {
  assert.match(source, /export const deleteGridRecord = internalMutation\(/)
  assert.match(source, /await ctx\.db\.delete\(args\.gridId\)/)
})

test("exports requestDeleteGrid public mutation that schedules deleteGrid", () => {
  assert.match(source, /export const requestDeleteGrid = mutation\(/)
  assert.match(source, /gridId:\s*v\.id\("discoveryGrids"\)/)
  assert.match(source, /await ctx\.scheduler\.runAfter\(\s*0,\s*internal\.discovery\.gridCells\.deleteGrid/)
})

test("requestDeleteGrid validates grid exists before scheduling", () => {
  const requestDeleteSection = source.slice(source.indexOf("export const requestDeleteGrid"))
  assert.match(requestDeleteSection, /const grid = await ctx\.db\.get\(args\.gridId\)/)
  assert.match(requestDeleteSection, /throw new ConvexError\("Grid not found"\)/)
})

test("DELETE_BATCH_SIZE is set to 500", () => {
  assert.match(source, /const DELETE_BATCH_SIZE = 500/)
})

test("deleteGrid returns totalCellsDeleted count", () => {
  assert.match(source, /return\s*\{\s*totalCellsDeleted:\s*totalDeleted\s*\}/)
})

test("imports internalAction from server and internal from api", () => {
  assert.match(source, /import\s*\{[^}]*internal[^}]*\}\s*from\s*"\.\.\/\_generated\/api"/)
  assert.match(source, /import\s*\{[^}]*internalAction[^}]*\}\s*from\s*"\.\.\/\_generated\/server"/)
})
