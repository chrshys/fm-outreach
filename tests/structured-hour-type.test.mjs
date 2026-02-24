import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/googlePlaces.ts", "utf8");

test("StructuredHour type is exported with correct fields", () => {
  assert.match(source, /export\s+type\s+StructuredHour\s*=/);
  assert.match(source, /day:\s*number/);
  assert.match(source, /open:\s*string/);
  assert.match(source, /close:\s*string/);
  assert.match(source, /isClosed:\s*boolean/);
});
