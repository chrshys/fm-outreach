import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/leads.ts", "utf8");

const exportMatch = source.match(
  /export\s+const\s+listForExport\s*=\s*query\(\{[\s\S]*?\n\}\);/,
);
const block = exportMatch ? exportMatch[0] : "";
const mapBlock = block.match(/\.map\(\(lead\)\s*=>\s*[\s\S]*?\}\)/);
const projection = mapBlock ? mapBlock[0] : "";

test("listForExport projection includes isSeasonal field", () => {
  assert.match(
    projection,
    /isSeasonal:\s*lead\.isSeasonal/,
    "should project isSeasonal from lead",
  );
});

test("listForExport projection includes seasonalNote field", () => {
  assert.match(
    projection,
    /seasonalNote:\s*lead\.seasonalNote/,
    "should project seasonalNote from lead",
  );
});

test("isSeasonal appears after hours in listForExport projection", () => {
  const hoursIdx = projection.indexOf("hours:");
  const seasonalIdx = projection.indexOf("isSeasonal:");
  assert.ok(hoursIdx > -1, "hours must exist in projection");
  assert.ok(seasonalIdx > -1, "isSeasonal must exist in projection");
  assert.ok(seasonalIdx > hoursIdx, "isSeasonal should come after hours");
});

test("seasonalNote appears after isSeasonal in listForExport projection", () => {
  const seasonalIdx = projection.indexOf("isSeasonal:");
  const noteIdx = projection.indexOf("seasonalNote:");
  assert.ok(seasonalIdx > -1, "isSeasonal must exist in projection");
  assert.ok(noteIdx > -1, "seasonalNote must exist in projection");
  assert.ok(noteIdx > seasonalIdx, "seasonalNote should come after isSeasonal");
});
