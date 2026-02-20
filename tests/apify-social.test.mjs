import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/apifySocial.ts", "utf8");

test("exports scrapeSocialPages action", () => {
  assert.match(source, /export\s+const\s+scrapeSocialPages\s*=\s*action\(/);
});

test("exports ApifySocialResult type", () => {
  assert.match(source, /export\s+type\s+ApifySocialResult\s*=/);
});

test("reads APIFY_API_TOKEN from process.env", () => {
  assert.match(source, /process\.env\.APIFY_API_TOKEN/);
});

test("uses Facebook page contact info actor", () => {
  assert.match(source, /facebook-page-contact-information/);
});

test("uses Instagram profile scraper actor", () => {
  assert.match(source, /instagram-profile-scraper/);
});

test("accepts facebookUrl and instagramUsername as optional args", () => {
  assert.match(source, /facebookUrl:\s*v\.optional\(v\.string\(\)\)/);
  assert.match(source, /instagramUsername:\s*v\.optional\(v\.string\(\)\)/);
});

test("returns null when no token is configured", () => {
  assert.match(source, /if\s*\(\s*!apiToken\s*\)/);
  assert.match(source, /return\s+null/);
});

test("returns null when no args provided", () => {
  assert.match(source, /!args\.facebookUrl\s*&&\s*!args\.instagramUsername/);
  assert.match(source, /return\s+null/);
});
