import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const discoverCellSource = fs.readFileSync(
  "convex/discovery/discoverCell.ts",
  "utf8",
);
const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);

// --- sourceDetail includes grid name and cell ID ---

test("sourceDetail template includes the grid name variable", () => {
  assert.match(discoverCellSource, /sourceDetail:.*gridName/);
});

test("sourceDetail template includes the cell ID (args.cellId)", () => {
  assert.match(discoverCellSource, /sourceDetail:.*args\.cellId/);
});

test("sourceDetail template includes the depth", () => {
  assert.match(discoverCellSource, /sourceDetail:.*depth/);
});

test('sourceDetail format is Discovery grid "<name>" cell <id> [depth=<n>]', () => {
  assert.match(
    discoverCellSource,
    /sourceDetail:\s*`Discovery grid "\$\{gridName\}" cell \$\{args\.cellId\} \[depth=\$\{depth\}\]`/,
  );
});

// --- region and province come from grid ---

test("lead region is assigned from grid region", () => {
  // In the leads map, region should reference the destructured grid.region
  const leadsMapBlock = discoverCellSource.slice(
    discoverCellSource.indexOf("inBounds.map"),
    discoverCellSource.indexOf("// Step 9"),
  );
  assert.match(leadsMapBlock, /region,/);
});

test("lead province is assigned from grid province", () => {
  const leadsMapBlock = discoverCellSource.slice(
    discoverCellSource.indexOf("inBounds.map"),
    discoverCellSource.indexOf("// Step 9"),
  );
  assert.match(leadsMapBlock, /province,/);
});

test("region is destructured from grid object", () => {
  assert.match(discoverCellSource, /\{\s*(?:name:\s*gridName,\s*)?queries,\s*region,\s*province\s*\}/);
});

test("province is destructured from grid object", () => {
  assert.match(discoverCellSource, /\{\s*(?:name:\s*gridName,\s*)?queries,\s*region,\s*province\s*\}/);
});

// --- gridName is destructured from getCell grid response ---

test("gridName is destructured as alias of grid.name", () => {
  assert.match(discoverCellSource, /name:\s*gridName/);
});

// --- getCell returns grid name ---

test("getCell returns grid name in the grid object", () => {
  const getCellBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const getCell"),
    gridCellsSource.indexOf("export const updateCellStatus"),
  );
  assert.match(getCellBlock, /name:\s*grid\.name/);
});

// --- lead source is google_places for discovery ---

test('lead source is set to "google_places"', () => {
  const leadsMapBlock = discoverCellSource.slice(
    discoverCellSource.indexOf("inBounds.map"),
    discoverCellSource.indexOf("// Step 9"),
  );
  assert.match(leadsMapBlock, /source:\s*"google_places"/);
});
