import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// getCell internalQuery
test("exports getCell as an internalQuery with cellId argument", () => {
  assert.match(source, /export\s+const\s+getCell\s*=\s*internalQuery\(/);
  assert.match(source, /cellId:\s*v\.id\("discoveryCells"\)/);
});

test("getCell fetches the cell and its parent grid", () => {
  assert.match(source, /const cell = await ctx\.db\.get\(args\.cellId\)/);
  assert.match(source, /const grid = await ctx\.db\.get\(cell\.gridId\)/);
});

test("getCell throws ConvexError when cell not found", () => {
  // Check there's a cell not found error
  assert.match(source, /throw new ConvexError\("Cell not found"\)/);
});

test("getCell throws ConvexError when grid not found", () => {
  assert.match(source, /throw new ConvexError\("Grid not found"\)/);
});

test("getCell returns cell spread with grid containing queries, region, province", () => {
  assert.match(source, /\.\.\.cell/);
  assert.match(source, /grid:\s*\{/);
  assert.match(source, /queries:\s*grid\.queries/);
  assert.match(source, /region:\s*grid\.region/);
  assert.match(source, /province:\s*grid\.province/);
});

// updateCellStatus internalMutation
test("exports updateCellStatus as an internalMutation", () => {
  assert.match(source, /export\s+const\s+updateCellStatus\s*=\s*internalMutation\(/);
});

test("updateCellStatus accepts cellId and status arguments", () => {
  // The status validator appears multiple times; just verify the function has both args
  const updateCellStatusBlock = source.slice(
    source.indexOf("export const updateCellStatus"),
    source.indexOf("export const updateCellSearchResult"),
  );
  assert.match(updateCellStatusBlock, /cellId:\s*v\.id\("discoveryCells"\)/);
  assert.match(updateCellStatusBlock, /status:\s*v\.union\(/);
});

test("updateCellStatus patches the cell with the new status", () => {
  const updateCellStatusBlock = source.slice(
    source.indexOf("export const updateCellStatus"),
    source.indexOf("export const updateCellSearchResult"),
  );
  assert.match(updateCellStatusBlock, /await ctx\.db\.patch\(args\.cellId,\s*\{\s*status:\s*args\.status\s*\}\)/);
});

// updateCellSearchResult internalMutation
test("exports updateCellSearchResult as an internalMutation", () => {
  assert.match(source, /export\s+const\s+updateCellSearchResult\s*=\s*internalMutation\(/);
});

test("updateCellSearchResult accepts required search result arguments", () => {
  const block = source.slice(source.indexOf("export const updateCellSearchResult"));
  assert.match(block, /cellId:\s*v\.id\("discoveryCells"\)/);
  assert.match(block, /resultCount:\s*v\.number\(\)/);
  assert.match(block, /querySaturation:\s*v\.array\(/);
  assert.match(block, /lastSearchedAt:\s*v\.number\(\)/);
  assert.match(block, /newLeadsCount:\s*v\.number\(\)/);
});

test("updateCellSearchResult patches cell with status, resultCount, querySaturation, lastSearchedAt", () => {
  const block = source.slice(source.indexOf("export const updateCellSearchResult"));
  assert.match(block, /await ctx\.db\.patch\(args\.cellId,\s*\{/);
  assert.match(block, /status:\s*args\.status/);
  assert.match(block, /resultCount:\s*args\.resultCount/);
  assert.match(block, /querySaturation:\s*args\.querySaturation/);
  assert.match(block, /lastSearchedAt:\s*args\.lastSearchedAt/);
});

test("updateCellSearchResult increments parent grid totalLeadsFound by newLeadsCount", () => {
  const block = source.slice(source.indexOf("export const updateCellSearchResult"));
  assert.match(block, /totalLeadsFound:\s*grid\.totalLeadsFound\s*\+\s*args\.newLeadsCount/);
});

test("updateCellSearchResult fetches the parent grid record", () => {
  const block = source.slice(source.indexOf("export const updateCellSearchResult"));
  assert.match(block, /const grid = await ctx\.db\.get\(cell\.gridId\)/);
});

test("imports internalQuery from server", () => {
  assert.match(source, /import\s*\{[^}]*internalQuery[^}]*\}\s*from\s*"\.\.\/\_generated\/server"/);
});
