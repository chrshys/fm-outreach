import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

test("leads table has optional discoveryCellId field referencing discoveryCells", () => {
  assert.match(
    schemaSource,
    /discoveryCellId:\s*v\.optional\(v\.id\("discoveryCells"\)\)/,
  );
});

test("discoveryCellId appears after clusterId in leads table", () => {
  const clusterIdIdx = schemaSource.indexOf("clusterId: v.optional(v.id(\"clusters\"))");
  const discoveryCellIdIdx = schemaSource.indexOf("discoveryCellId: v.optional(v.id(\"discoveryCells\"))");
  assert.ok(clusterIdIdx > -1, "clusterId field should exist");
  assert.ok(discoveryCellIdIdx > -1, "discoveryCellId field should exist");
  assert.ok(discoveryCellIdIdx > clusterIdIdx, "discoveryCellId should come after clusterId");
});
