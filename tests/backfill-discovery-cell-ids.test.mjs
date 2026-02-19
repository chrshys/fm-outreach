import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

// ============================================================
// Tests for backfillDiscoveryCellIds internalMutation
// in convex/discovery/gridCells.ts
// ============================================================

const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);

// -- Source code pattern tests --------------------------------

test("backfillDiscoveryCellIds is exported as an internalMutation", () => {
  assert.match(
    gridCellsSource,
    /export\s+const\s+backfillDiscoveryCellIds\s*=\s*internalMutation\(/,
    "Should be an exported internalMutation",
  );
});

test("backfillDiscoveryCellIds filters leads by source === google_places", () => {
  assert.match(
    gridCellsSource,
    /q\.eq\(q\.field\(["']source["']\),\s*["']google_places["']\)/,
    "Should filter leads where source is google_places",
  );
});

test("backfillDiscoveryCellIds skips leads that already have discoveryCellId", () => {
  assert.match(
    gridCellsSource,
    /lead\.discoveryCellId/,
    "Should check for existing discoveryCellId on each lead",
  );
});

test("backfillDiscoveryCellIds uses correct regex to extract cell ID from sourceDetail", () => {
  assert.match(
    gridCellsSource,
    /cell\\s\+\(\[a-z0-9\]\+\)\\s\+\\\[depth=/,
    "Should use regex /cell\\s+([a-z0-9]+)\\s+\\[depth=/ to extract cell ID",
  );
});

test("backfillDiscoveryCellIds patches leads with extracted discoveryCellId", () => {
  assert.match(
    gridCellsSource,
    /ctx\.db\.patch\(lead\._id,\s*\{\s*discoveryCellId:\s*extractedId\s*\}\)/,
    "Should patch each lead with the extracted discoveryCellId",
  );
});

test("backfillDiscoveryCellIds returns updated and skipped counts", () => {
  assert.match(
    gridCellsSource,
    /return\s*\{\s*updated,\s*skipped\s*\}/,
    "Should return { updated, skipped }",
  );
});

test("backfillDiscoveryCellIds skips leads with no sourceDetail", () => {
  assert.match(
    gridCellsSource,
    /!lead\.sourceDetail/,
    "Should check for missing sourceDetail and skip",
  );
});

// -- Regex extraction logic tests -----------------------------

test("regex extracts cell ID from valid sourceDetail format", () => {
  const cellIdRegex = /cell\s+([a-z0-9]+)\s+\[depth=/;

  const sourceDetail =
    'Discovery grid "Niagara Peninsula" cell j572abc9def01 [depth=2]';
  const match = cellIdRegex.exec(sourceDetail);

  assert.ok(match, "Regex should match standard sourceDetail format");
  assert.equal(match[1], "j572abc9def01", "Should extract the cell ID");
});

test("regex does not match sourceDetail without cell ID pattern", () => {
  const cellIdRegex = /cell\s+([a-z0-9]+)\s+\[depth=/;

  assert.equal(
    cellIdRegex.exec('Google Places discovery: "farms near"'),
    null,
    "Should not match non-cell sourceDetail",
  );

  assert.equal(
    cellIdRegex.exec(""),
    null,
    "Should not match empty string",
  );
});

test("regex handles various cell ID formats from Convex", () => {
  const cellIdRegex = /cell\s+([a-z0-9]+)\s+\[depth=/;

  // Convex IDs are alphanumeric lowercase
  const cases = [
    ['Discovery grid "Test" cell abc123 [depth=0]', "abc123"],
    ['Discovery grid "Test" cell j5d72n9q4ekcrspxzb5rm1hkhn6z94y6 [depth=3]', "j5d72n9q4ekcrspxzb5rm1hkhn6z94y6"],
  ];

  for (const [input, expected] of cases) {
    const match = cellIdRegex.exec(input);
    assert.ok(match, `Should match: ${input}`);
    assert.equal(match[1], expected);
  }
});
