import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

// ============================================================
// Tests for spotCheckBackfillDiscoveryCellIds internalQuery
// in convex/discovery/gridCells.ts
// ============================================================

const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);

// -- Source code pattern tests --------------------------------

test("spotCheckBackfillDiscoveryCellIds is exported as an internalQuery", () => {
  assert.match(
    gridCellsSource,
    /export\s+const\s+spotCheckBackfillDiscoveryCellIds\s*=\s*internalQuery\(/,
    "Should be an exported internalQuery",
  );
});

test("spotCheckBackfillDiscoveryCellIds filters leads by source === google_places", () => {
  // The query section should filter for google_places source
  const fnBody = gridCellsSource.slice(
    gridCellsSource.indexOf("spotCheckBackfillDiscoveryCellIds"),
  );
  assert.match(
    fnBody,
    /q\.eq\(q\.field\(["']source["']\),\s*["']google_places["']\)/,
    "Should filter leads where source is google_places",
  );
});

test("spotCheckBackfillDiscoveryCellIds checks discoveryCellId on each lead", () => {
  assert.match(
    gridCellsSource,
    /lead\.discoveryCellId/,
    "Should check discoveryCellId on each lead",
  );
});

test("spotCheckBackfillDiscoveryCellIds uses same regex as backfill to detect cell pattern", () => {
  const fnBody = gridCellsSource.slice(
    gridCellsSource.indexOf("spotCheckBackfillDiscoveryCellIds"),
  );
  assert.match(
    fnBody,
    /cell\\s\+\(\[a-z0-9\]\+\)\\s\+\\\[depth=/,
    "Should use the same cell ID regex as the backfill mutation",
  );
});

test("spotCheckBackfillDiscoveryCellIds returns backfillComplete flag", () => {
  const fnBody = gridCellsSource.slice(
    gridCellsSource.indexOf("spotCheckBackfillDiscoveryCellIds"),
  );
  assert.match(
    fnBody,
    /backfillComplete:\s*missingCellId\s*===\s*0/,
    "Should return backfillComplete: missingCellId === 0",
  );
});

test("spotCheckBackfillDiscoveryCellIds returns count fields", () => {
  const fnBody = gridCellsSource.slice(
    gridCellsSource.indexOf("spotCheckBackfillDiscoveryCellIds"),
  );
  assert.match(fnBody, /totalGooglePlacesLeads/, "Should return totalGooglePlacesLeads");
  assert.match(fnBody, /withDiscoveryCellId/, "Should return withDiscoveryCellId");
  assert.match(fnBody, /missingDiscoveryCellId/, "Should return missingDiscoveryCellId");
});

test("spotCheckBackfillDiscoveryCellIds collects up to 5 missing examples", () => {
  const fnBody = gridCellsSource.slice(
    gridCellsSource.indexOf("spotCheckBackfillDiscoveryCellIds"),
  );
  assert.match(
    fnBody,
    /missingExamples\.length\s*<\s*5/,
    "Should limit missing examples to 5",
  );
});

test("spotCheckBackfillDiscoveryCellIds returns missingExamples with lead details", () => {
  const fnBody = gridCellsSource.slice(
    gridCellsSource.indexOf("spotCheckBackfillDiscoveryCellIds"),
  );
  assert.match(fnBody, /id:\s*lead\._id/, "Should include lead ID in examples");
  assert.match(fnBody, /name:\s*lead\.name/, "Should include lead name in examples");
  assert.match(
    fnBody,
    /sourceDetail:\s*lead\.sourceDetail/,
    "Should include sourceDetail in examples",
  );
});
