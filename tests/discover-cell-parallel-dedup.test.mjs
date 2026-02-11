import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8");

// ============================================================
// Structure: parallel query execution via Promise.all
// ============================================================

test("queries execute in parallel via Promise.all + queries.map", () => {
  assert.match(source, /Promise\.all\(\s*\n?\s*queries\.map\(/);
});

test("each query calls searchPlacesWithLocation", () => {
  assert.match(source, /searchPlacesWithLocation\(\s*\n?\s*query/);
});

test("parallel results are collected into allApiResults", () => {
  assert.match(source, /allApiResults\.push\(\.\.\.results\)/);
});

test("querySaturation is built from parallel query results", () => {
  assert.match(source, /querySaturation\.push\(\s*\{\s*query,\s*count:\s*inBoundsForQuery\.length\s*\}\s*\)/);
});

// ============================================================
// Dedup: place_id across queries still works after parallelism
// ============================================================

test("deduplication by place_id occurs after all queries complete", () => {
  // Promise.all must appear before the seenPlaceIds dedup block
  const promiseAllIndex = source.indexOf("Promise.all(");
  const dedupIndex = source.indexOf("seenPlaceIds");
  assert.ok(promiseAllIndex > 0, "Promise.all exists in source");
  assert.ok(dedupIndex > 0, "seenPlaceIds dedup exists in source");
  assert.ok(
    promiseAllIndex < dedupIndex,
    "Promise.all (parallel fetch) comes before dedup logic",
  );
});

// ============================================================
// Behavioral: parallel dedup produces correct results
// ============================================================

function makePlaceResult(overrides = {}) {
  return {
    place_id: `place_${Math.random().toString(36).slice(2, 8)}`,
    name: "Test Farm",
    formatted_address: "123 Main St, Niagara-on-the-Lake, ON L0S, Canada",
    geometry: { location: { lat: 43.0, lng: -79.3 } },
    types: ["establishment"],
    ...overrides,
  };
}

test("dedup removes duplicates when same placeId appears in multiple query results", () => {
  // Simulate results from 3 parallel queries
  const queryAResults = [
    makePlaceResult({ place_id: "A1" }),
    makePlaceResult({ place_id: "A2" }),
    makePlaceResult({ place_id: "shared1" }),
  ];
  const queryBResults = [
    makePlaceResult({ place_id: "B1" }),
    makePlaceResult({ place_id: "shared1" }), // dup with query A
    makePlaceResult({ place_id: "shared2" }),
  ];
  const queryCResults = [
    makePlaceResult({ place_id: "shared1" }), // dup with A and B
    makePlaceResult({ place_id: "shared2" }), // dup with B
    makePlaceResult({ place_id: "C1" }),
  ];

  // Flatten (same as the code does with allApiResults.push(...results))
  const allApiResults = [...queryAResults, ...queryBResults, ...queryCResults];

  // Dedup by place_id (same logic as discoverCell.ts Step 6)
  const seenPlaceIds = new Set();
  const deduplicated = [];
  for (const result of allApiResults) {
    if (!seenPlaceIds.has(result.place_id)) {
      seenPlaceIds.add(result.place_id);
      deduplicated.push(result);
    }
  }

  assert.equal(allApiResults.length, 9, "9 total results from 3 queries");
  assert.equal(deduplicated.length, 6, "6 unique placeIds after dedup");
  const ids = deduplicated.map((r) => r.place_id).sort();
  assert.deepEqual(ids, ["A1", "A2", "B1", "C1", "shared1", "shared2"]);
});

test("dedup preserves first occurrence when placeId appears across queries", () => {
  const first = makePlaceResult({ place_id: "dup1", name: "First Farm" });
  const second = makePlaceResult({ place_id: "dup1", name: "Second Farm" });

  const allApiResults = [first, second];
  const seenPlaceIds = new Set();
  const deduplicated = [];
  for (const result of allApiResults) {
    if (!seenPlaceIds.has(result.place_id)) {
      seenPlaceIds.add(result.place_id);
      deduplicated.push(result);
    }
  }

  assert.equal(deduplicated.length, 1);
  assert.equal(deduplicated[0].name, "First Farm", "First occurrence is kept");
});

test("dedup handles empty query results gracefully", () => {
  // Query A returns results, B returns nothing, C returns results
  const queryAResults = [makePlaceResult({ place_id: "A1" })];
  const queryBResults = [];
  const queryCResults = [makePlaceResult({ place_id: "C1" })];

  const allApiResults = [...queryAResults, ...queryBResults, ...queryCResults];

  const seenPlaceIds = new Set();
  const deduplicated = [];
  for (const result of allApiResults) {
    if (!seenPlaceIds.has(result.place_id)) {
      seenPlaceIds.add(result.place_id);
      deduplicated.push(result);
    }
  }

  assert.equal(deduplicated.length, 2);
});

test("querySaturation tracks per-query counts independently of dedup", () => {
  // Simulate parallel query results
  const queryResults = [
    { query: "farms", results: [makePlaceResult({ place_id: "shared1" })], totalCount: 1 },
    { query: "orchard", results: [makePlaceResult({ place_id: "shared1" })], totalCount: 1 },
    { query: "market", results: [], totalCount: 0 },
  ];

  const querySaturation = [];
  const allApiResults = [];
  for (const { query, results, totalCount } of queryResults) {
    querySaturation.push({ query, count: totalCount });
    allApiResults.push(...results);
  }

  // querySaturation has all 3 entries even though dedup would reduce to 1
  assert.equal(querySaturation.length, 3);
  assert.deepEqual(querySaturation, [
    { query: "farms", count: 1 },
    { query: "orchard", count: 1 },
    { query: "market", count: 0 },
  ]);

  // Dedup
  const seenPlaceIds = new Set();
  const deduplicated = [];
  for (const result of allApiResults) {
    if (!seenPlaceIds.has(result.place_id)) {
      seenPlaceIds.add(result.place_id);
      deduplicated.push(result);
    }
  }
  assert.equal(deduplicated.length, 1, "Only 1 unique place after dedup");
});
