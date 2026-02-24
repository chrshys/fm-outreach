import { test, describe } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const schema = readFileSync("convex/schema.ts", "utf-8");
const tableStart = schema.indexOf("leads: defineTable(");
const tableBlock = tableStart > -1 ? schema.slice(tableStart) : "";

describe("leads table – isSeasonal & seasonalNote fields", () => {
  test("schema includes isSeasonal as optional boolean", () => {
    assert.match(
      schema,
      /isSeasonal:\s*v\.optional\(v\.boolean\(\)\)/,
      "isSeasonal field should be v.optional(v.boolean())",
    );
  });

  test("schema includes seasonalNote as optional string", () => {
    assert.match(
      schema,
      /seasonalNote:\s*v\.optional\(v\.string\(\)\)/,
      "seasonalNote field should be v.optional(v.string())",
    );
  });

  test("isSeasonal appears after hours", () => {
    const hoursIdx = tableBlock.indexOf("hours:");
    const seasonalIdx = tableBlock.indexOf("isSeasonal:");
    assert.ok(hoursIdx > -1, "hours must exist in leads table");
    assert.ok(seasonalIdx > -1, "isSeasonal must exist in leads table");
    assert.ok(
      seasonalIdx > hoursIdx,
      "isSeasonal should come after hours",
    );
  });

  test("seasonalNote appears after isSeasonal", () => {
    const seasonalIdx = tableBlock.indexOf("isSeasonal:");
    const noteIdx = tableBlock.indexOf("seasonalNote:");
    assert.ok(seasonalIdx > -1, "isSeasonal must exist in leads table");
    assert.ok(noteIdx > -1, "seasonalNote must exist in leads table");
    assert.ok(
      noteIdx > seasonalIdx,
      "seasonalNote should come after isSeasonal",
    );
  });
});
