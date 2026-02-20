import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/apifySocial.ts", "utf8");

test("exports ApifySocialResult type", () => {
  assert.match(source, /export\s+type\s+ApifySocialResult\s*=/);
});

test("ApifySocialResult has email field (string | null)", () => {
  assert.match(source, /email:\s*string\s*\|\s*null/);
});

test("ApifySocialResult has phone field (string | null)", () => {
  assert.match(source, /phone:\s*string\s*\|\s*null/);
});

test("ApifySocialResult has website field (string | null)", () => {
  assert.match(source, /website:\s*string\s*\|\s*null/);
});
