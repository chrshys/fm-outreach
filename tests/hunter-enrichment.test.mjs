import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/hunter.ts", "utf8");

test("searchDomain action exists and accepts a domain arg", () => {
  assert.match(source, /export\s+const\s+searchDomain\s*=\s*action\(/);
  assert.match(source, /domain:\s*v\.string\(\)/);
});

test("exports HunterResult type with domain and emails fields", () => {
  assert.match(source, /export\s+type\s+HunterResult\s*=/);
  assert.match(source, /domain:\s*string/);
  assert.match(source, /emails:\s*HunterEmail\[\]/);
});

test("exports HunterEmail type with email, name, position, confidence", () => {
  assert.match(source, /export\s+type\s+HunterEmail\s*=/);
  assert.match(source, /email:\s*string/);
  assert.match(source, /firstName:\s*string\s*\|\s*null/);
  assert.match(source, /lastName:\s*string\s*\|\s*null/);
  assert.match(source, /position:\s*string\s*\|\s*null/);
  assert.match(source, /confidence:\s*number/);
});

test("calls Hunter.io Domain Search API with correct URL", () => {
  assert.match(source, /https:\/\/api\.hunter\.io\/v2\/domain-search/);
  assert.match(source, /domain=\$\{encodedDomain\}&api_key=\$\{apiKey\}/);
});

test("reads HUNTER_API_KEY from environment", () => {
  assert.match(source, /process\.env\.HUNTER_API_KEY/);
});

test("returns null when no HUNTER_API_KEY is configured (skip behavior)", () => {
  assert.match(source, /if\s*\(\s*!apiKey\s*\)/);
  assert.match(source, /return\s+null/);
});

test("handles rate limits (HTTP 429) with descriptive error", () => {
  assert.match(source, /response\.status\s*===\s*429/);
  assert.match(source, /rate\s+limit\s+exceeded/i);
});

test("handles non-OK API responses by throwing", () => {
  assert.match(source, /!response\.ok/);
  assert.match(source, /Hunter\.io\s+API\s+error/);
  assert.match(source, /response\.status/);
});

test("handles API-level errors from response body", () => {
  assert.match(source, /data\.errors/);
  assert.match(source, /Hunter\.io\s+error:/);
});

test("returns empty emails array when no results found", () => {
  assert.match(source, /emails\.length\s*===\s*0/);
  assert.match(source, /emails:\s*\[\]/);
});

test("encodes domain parameter for URL safety", () => {
  assert.match(source, /encodeURIComponent\(args\.domain\)/);
});

test("parseEmails maps API fields to HunterEmail shape", () => {
  assert.match(source, /function\s+parseEmails\(/);
  assert.match(source, /e\.value/);
  assert.match(source, /e\.first_name/);
  assert.match(source, /e\.last_name/);
  assert.match(source, /e\.position/);
  assert.match(source, /e\.confidence/);
});

test("parseEmails filters out entries without email value", () => {
  assert.match(source, /\.filter\(\(e\)\s*=>\s*e\.value\)/);
});

test("returns structured result with domain and emails array", () => {
  assert.match(source, /return\s*\{/);
  assert.match(source, /domain:\s*args\.domain/);
  assert.match(source, /emails,/);
});
