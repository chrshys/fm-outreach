import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

test("discoveryGrids table exists in schema", () => {
  assert.match(schemaSource, /\bdiscoveryGrids:\s*defineTable\(/);
});

test("discoveryGrids has all required fields", () => {
  const tableMatch = schemaSource.match(
    /discoveryGrids:\s*defineTable\(\{([\s\S]*?)\}\)/,
  );
  assert.ok(tableMatch, "discoveryGrids table definition not found");
  const body = tableMatch[1];

  const requiredFields = [
    ["name", "v.string()"],
    ["region", "v.string()"],
    ["province", "v.string()"],
    ["queries", "v.array(v.string())"],
    ["swLat", "v.number()"],
    ["swLng", "v.number()"],
    ["neLat", "v.number()"],
    ["neLng", "v.number()"],
    ["cellSizeKm", "v.number()"],
    ["totalLeadsFound", "v.number()"],
    ["createdAt", "v.number()"],
  ];

  for (const [field, type] of requiredFields) {
    assert.match(
      body,
      new RegExp(`${field}:\\s*${type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
      `Missing or incorrect field: ${field} should be ${type}`,
    );
  }
});

test("discoveryGrids does not have a separate gridId field", () => {
  const tableMatch = schemaSource.match(
    /discoveryGrids:\s*defineTable\(\{([\s\S]*?)\}\)/,
  );
  assert.ok(tableMatch);
  const body = tableMatch[1];
  assert.doesNotMatch(body, /\bgridId\b/, "Should use Convex _id, not a separate gridId field");
});

test("discoveryGrids has exactly 11 fields", () => {
  const tableMatch = schemaSource.match(
    /discoveryGrids:\s*defineTable\(\{([\s\S]*?)\}\)/,
  );
  assert.ok(tableMatch);
  const body = tableMatch[1];
  // Count top-level field definitions (word followed by colon and v.)
  const fieldMatches = body.match(/\w+:\s*v\./g);
  assert.equal(fieldMatches.length, 11, `Expected 11 fields, found ${fieldMatches.length}`);
});
