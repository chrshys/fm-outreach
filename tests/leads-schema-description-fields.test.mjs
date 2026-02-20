import { test, describe } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const schema = readFileSync("convex/schema.ts", "utf-8");

describe("leads table – locationDescription & imagePrompt fields", () => {
  test("schema includes locationDescription as optional string", () => {
    assert.match(
      schema,
      /locationDescription:\s*v\.optional\(v\.string\(\)\)/,
      "locationDescription field should be v.optional(v.string())",
    );
  });

  test("schema includes imagePrompt as optional string", () => {
    assert.match(
      schema,
      /imagePrompt:\s*v\.optional\(v\.string\(\)\)/,
      "imagePrompt field should be v.optional(v.string())",
    );
  });

  test("locationDescription appears after farmDescription", () => {
    const farmIdx = schema.indexOf("farmDescription");
    const locIdx = schema.indexOf("locationDescription");
    assert.ok(farmIdx > -1, "farmDescription must exist");
    assert.ok(locIdx > -1, "locationDescription must exist");
    assert.ok(
      locIdx > farmIdx,
      "locationDescription should come after farmDescription",
    );
  });

  test("imagePrompt appears after locationDescription", () => {
    const locIdx = schema.indexOf("locationDescription");
    const imgIdx = schema.indexOf("imagePrompt");
    assert.ok(locIdx > -1, "locationDescription must exist");
    assert.ok(imgIdx > -1, "imagePrompt must exist");
    assert.ok(
      imgIdx > locIdx,
      "imagePrompt should come after locationDescription",
    );
  });
});
