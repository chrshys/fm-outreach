import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/leads.ts", "utf8");

test("exports listWithCoords as a query", () => {
  assert.match(source, /export\s+const\s+listWithCoords\s*=\s*query\(/);
});

test("listWithCoords takes no arguments", () => {
  // Extract the listWithCoords block and verify args: {}
  const match = source.match(/listWithCoords\s*=\s*query\(\{[\s\S]*?args:\s*\{\s*\}/);
  assert.ok(match, "listWithCoords should have empty args: {}");
});

test("listWithCoords filters leads that have both latitude and longitude", () => {
  assert.match(source, /lead\.latitude\s*!==\s*undefined/);
  assert.match(source, /lead\.longitude\s*!==\s*undefined/);
});

test("listWithCoords returns only the required map fields", () => {
  const queryBlock = source.slice(source.indexOf("listWithCoords"));
  const mapBlock = queryBlock.slice(0, queryBlock.indexOf("export const"));

  for (const field of ["_id", "name", "type", "city", "status", "latitude", "longitude", "clusterId"]) {
    assert.match(mapBlock, new RegExp(`${field}:\\s*lead\\.${field}`), `should project field ${field}`);
  }
});

test("listWithCoords does not return extra lead fields", () => {
  const queryBlock = source.slice(source.indexOf("listWithCoords"));
  const mapBlock = queryBlock.slice(0, queryBlock.indexOf("export const"));

  for (const field of ["address", "contactEmail", "contactPhone", "website", "notes", "products"]) {
    assert.doesNotMatch(mapBlock, new RegExp(`${field}:\\s*lead\\.${field}`), `should NOT project field ${field}`);
  }
});
