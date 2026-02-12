import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8");

// ============================================================
// Entering discovery mode auto-creates a fresh global grid.
//
// After stale data is purged, the first discovery mode entry
// triggers getOrCreateGlobalGrid which inserts a grid with
// correct defaults — no leftover state from previous grids.
// ============================================================

// --- getOrCreateGlobalGrid creates grid when none exists ---

test("getOrCreateGlobalGrid queries discoveryGrids to check for existing grid", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid = mutation({",
  );
  assert.ok(fnStart !== -1, "getOrCreateGlobalGrid must exist");

  const fnEnd = gridCellsSource.indexOf("export const purge", fnStart);
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  assert.match(
    fnBlock,
    /ctx\.db\.query\("discoveryGrids"\)\.collect\(\)/,
    "must query all discoveryGrids to check if one exists",
  );
});

test("getOrCreateGlobalGrid returns existing grid without creating a new one", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid = mutation({",
  );
  const fnEnd = gridCellsSource.indexOf("export const purge", fnStart);
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  assert.match(
    fnBlock,
    /if\s*\(grid\)\s*\{[\s\S]*?return\s*\{\s*gridId:\s*grid\._id,\s*created:\s*false\s*\}/,
    "must return existing grid with created: false",
  );
});

test("getOrCreateGlobalGrid creates grid with name Discovery", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid = mutation({",
  );
  const fnEnd = gridCellsSource.indexOf("export const purge", fnStart);
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  assert.match(
    fnBlock,
    /name:\s*"Discovery"/,
    "fresh grid name must be 'Discovery'",
  );
});

test("getOrCreateGlobalGrid creates grid with default queries", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid = mutation({",
  );
  const fnEnd = gridCellsSource.indexOf("export const purge", fnStart);
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  assert.match(
    fnBlock,
    /queries:\s*DEFAULT_QUERIES/,
    "fresh grid must use DEFAULT_QUERIES",
  );
});

test("getOrCreateGlobalGrid creates grid with default cell size", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid = mutation({",
  );
  const fnEnd = gridCellsSource.indexOf("export const purge", fnStart);
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  assert.match(
    fnBlock,
    /cellSizeKm:\s*DEFAULT_CELL_SIZE_KM/,
    "fresh grid must use DEFAULT_CELL_SIZE_KM",
  );
});

test("getOrCreateGlobalGrid initializes totalLeadsFound to 0", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid = mutation({",
  );
  const fnEnd = gridCellsSource.indexOf("export const purge", fnStart);
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  assert.match(
    fnBlock,
    /totalLeadsFound:\s*0/,
    "fresh grid must start with totalLeadsFound: 0",
  );
});

test("getOrCreateGlobalGrid sets createdAt timestamp", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid = mutation({",
  );
  const fnEnd = gridCellsSource.indexOf("export const purge", fnStart);
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  assert.match(
    fnBlock,
    /createdAt:\s*Date\.now\(\)/,
    "fresh grid must set createdAt to current timestamp",
  );
});

test("getOrCreateGlobalGrid returns created: true for new grid", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid = mutation({",
  );
  const fnEnd = gridCellsSource.indexOf("export const purge", fnStart);
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  assert.match(
    fnBlock,
    /return\s*\{\s*gridId,\s*created:\s*true\s*\}/,
    "must return created: true for a newly created grid",
  );
});

// --- DEFAULT_QUERIES and DEFAULT_CELL_SIZE_KM are defined ---

test("DEFAULT_QUERIES contains expected search terms", () => {
  assert.match(
    gridCellsSource,
    /const\s+DEFAULT_QUERIES\s*=\s*\[\s*"farm market"/,
    "DEFAULT_QUERIES must be defined with 'farm market' as first term",
  );
  assert.match(gridCellsSource, /"fruit stand"/);
  assert.match(gridCellsSource, /"farmers market"/);
});

test("DEFAULT_CELL_SIZE_KM is 10", () => {
  assert.match(
    gridCellsSource,
    /const\s+DEFAULT_CELL_SIZE_KM\s*=\s*10/,
    "DEFAULT_CELL_SIZE_KM must be 10",
  );
});

// --- Page auto-create wiring triggers on discovery mode entry ---

test("page calls getOrCreateGlobalGrid when viewMode is discovery and globalGridId is null", () => {
  assert.match(
    pageSource,
    /viewMode\s*===\s*"discovery"\s*&&\s*globalGridId\s*===\s*null/,
    "useEffect guard must check for discovery mode and null gridId",
  );
  assert.match(
    pageSource,
    /getOrCreateGlobalGrid\(\{\}\)/,
    "must call getOrCreateGlobalGrid with no args",
  );
});

test("page sets globalGridId from getOrCreateGlobalGrid result", () => {
  assert.match(
    pageSource,
    /setGlobalGridId\(result\.gridId\)/,
    "must set globalGridId to the returned gridId",
  );
});

test("globalGridId starts as null ensuring fresh creation on first entry", () => {
  assert.match(
    pageSource,
    /useMapStore\(\(s\)\s*=>\s*s\.globalGridId\)/,
    "globalGridId must come from zustand store",
  );
});
