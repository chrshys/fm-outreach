import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/apifyWebsite.ts", "utf8");

test("exports ApifyWebsiteResult type", () => {
  assert.match(source, /export\s+type\s+ApifyWebsiteResult\s*=/);
});

test("ApifyWebsiteResult has emails array field", () => {
  assert.match(source, /emails:\s*string\[\]/);
});

test("ApifyWebsiteResult has phones array field", () => {
  assert.match(source, /phones:\s*string\[\]/);
});

test("ApifyWebsiteResult has socialLinks with facebook field", () => {
  assert.match(source, /facebook:\s*string\s*\|\s*null/);
});

test("ApifyWebsiteResult has socialLinks with instagram field", () => {
  assert.match(source, /instagram:\s*string\s*\|\s*null/);
});
