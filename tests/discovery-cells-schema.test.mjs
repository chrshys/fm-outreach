import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

// Extract the full discoveryCells block (from defineTable to the closing indexes)
function getDiscoveryCellsBlock() {
  const start = schemaSource.indexOf("discoveryCells: defineTable(");
  assert.ok(start !== -1, "discoveryCells table definition not found");
  // Find the next table definition or end of schema to delimit the block
  const rest = schemaSource.slice(start);
  const nextTable = rest.indexOf("\n\n  ", 1);
  return nextTable !== -1 ? rest.slice(0, nextTable) : rest;
}

test("discoveryCells table exists in schema", () => {
  assert.match(schemaSource, /\bdiscoveryCells:\s*defineTable\(/);
});

test("discoveryCells has all required fields", () => {
  const block = getDiscoveryCellsBlock();

  const requiredFields = [
    ["swLat", "v.number()"],
    ["swLng", "v.number()"],
    ["neLat", "v.number()"],
    ["neLng", "v.number()"],
    ["depth", "v.number()"],
    ["isLeaf", "v.boolean()"],
    ["gridId", 'v.id("discoveryGrids")'],
  ];

  for (const [field, type] of requiredFields) {
    assert.match(
      block,
      new RegExp(`${field}:\\s*${type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
      `Missing or incorrect field: ${field} should be ${type}`,
    );
  }
});

test("discoveryCells has optional fields", () => {
  const block = getDiscoveryCellsBlock();

  assert.match(
    block,
    /parentCellId:\s*v\.optional\(v\.id\("discoveryCells"\)\)/,
    "parentCellId should be optional self-referencing id",
  );
  assert.match(
    block,
    /resultCount:\s*v\.optional\(v\.number\(\)\)/,
    "resultCount should be optional number",
  );
  assert.match(
    block,
    /lastSearchedAt:\s*v\.optional\(v\.number\(\)\)/,
    "lastSearchedAt should be optional number",
  );
  assert.match(
    block,
    /querySaturation:\s*v\.optional\(\s*v\.array\(v\.object\(\{\s*query:\s*v\.string\(\),\s*count:\s*v\.number\(\)\s*\}\)\)/,
    "querySaturation should be optional array of {query, count}",
  );
});

test("discoveryCells status field has correct union values", () => {
  const block = getDiscoveryCellsBlock();

  for (const status of ["unsearched", "searched", "saturated", "searching"]) {
    assert.match(
      block,
      new RegExp(`v\\.literal\\("${status}"\\)`),
      `Missing status literal: ${status}`,
    );
  }
});

test("discoveryCells has by_gridId index", () => {
  assert.match(
    schemaSource,
    /discoveryCells:[\s\S]*?\.index\("by_gridId",\s*\["gridId"\]\)/,
  );
});

test("discoveryCells has by_gridId_isLeaf index", () => {
  assert.match(
    schemaSource,
    /discoveryCells:[\s\S]*?\.index\("by_gridId_isLeaf",\s*\["gridId",\s*"isLeaf"\]\)/,
  );
});

test("discoveryCells has by_parentCellId index", () => {
  assert.match(
    schemaSource,
    /discoveryCells:[\s\S]*?\.index\("by_parentCellId",\s*\["parentCellId"\]\)/,
  );
});

test("discoveryCells has exactly 12 fields", () => {
  const block = getDiscoveryCellsBlock();
  // Count top-level field definitions (word followed by colon and v.)
  const fieldMatches = block.match(/\w+:\s*v\./g);
  // Subtract nested fields inside v.object (query and count inside querySaturation)
  const nestedFields = block.match(/v\.object\(\{[^}]*\}\)/g);
  let nestedCount = 0;
  if (nestedFields) {
    for (const nested of nestedFields) {
      const inner = nested.match(/\w+:\s*v\./g);
      if (inner) nestedCount += inner.length;
    }
  }
  const topLevelCount = fieldMatches.length - nestedCount;
  assert.equal(topLevelCount, 12, `Expected 12 fields, found ${topLevelCount}`);
});
