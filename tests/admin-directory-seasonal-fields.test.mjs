import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "../fruitland-market/packages/backend/convex/adminDirectory.ts",
  "utf8",
);

test("csvRowValidator includes optional isSeasonal boolean field", () => {
  assert.match(source, /isSeasonal:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("csvRowValidator includes optional seasonalNote string field", () => {
  assert.match(source, /seasonalNote:\s*v\.optional\(v\.string\(\)\)/);
});

test("isSeasonal appears after hours in csvRowValidator", () => {
  const hoursIdx = source.indexOf("hours: v.optional(");
  const isSeasonalIdx = source.indexOf("isSeasonal: v.optional(v.boolean())");
  assert.ok(hoursIdx > -1, "hours field should exist in csvRowValidator");
  assert.ok(isSeasonalIdx > -1, "isSeasonal field should exist in csvRowValidator");
  assert.ok(isSeasonalIdx > hoursIdx, "isSeasonal should appear after hours");
});

test("seasonalNote appears after isSeasonal in csvRowValidator", () => {
  const isSeasonalIdx = source.indexOf("isSeasonal: v.optional(v.boolean())");
  const seasonalNoteIdx = source.indexOf("seasonalNote: v.optional(v.string())");
  assert.ok(isSeasonalIdx > -1, "isSeasonal field should exist");
  assert.ok(seasonalNoteIdx > -1, "seasonalNote field should exist");
  assert.ok(seasonalNoteIdx > isSeasonalIdx, "seasonalNote should appear after isSeasonal");
});
