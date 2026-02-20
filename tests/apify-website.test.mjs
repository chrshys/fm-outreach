import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/apifyWebsite.ts", "utf8");

// (a) exports scrapeContacts action
test("exports scrapeContacts as a Convex action", () => {
  assert.match(source, /export\s+const\s+scrapeContacts\s*=\s*action\(/);
});

// (b) exports ApifyWebsiteResult type
test("exports ApifyWebsiteResult type", () => {
  assert.match(source, /export\s+type\s+ApifyWebsiteResult\s*=/);
});

// (c) reads APIFY_API_TOKEN from process.env
test("reads APIFY_API_TOKEN from process.env", () => {
  assert.match(source, /process\.env\.APIFY_API_TOKEN/);
});

// (d) uses betterdevsscrape actor (contact-details-extractor)
test("uses betterdevsscrape contact-details-extractor actor", () => {
  assert.match(source, /betterdevsscrape~contact-details-extractor/);
});

// (e) uses Apify sync endpoint (api.apify.com/v2/acts)
test("uses Apify sync endpoint api.apify.com/v2/acts", () => {
  assert.match(source, /api\.apify\.com\/v2\/acts/);
});

// (f) uses maxDepth: 0
test("uses maxDepth: 0", () => {
  assert.match(source, /maxDepth:\s*0/);
});

// (g) sends Authorization: Bearer header
test("sends Authorization: Bearer header", () => {
  assert.match(source, /Authorization.*Bearer/);
});

// (h) handles 429 rate limit
test("handles 429 rate limit", () => {
  assert.match(source, /429/);
  assert.match(source, /rate limit/i);
});

// (i) filters boilerplate emails
test("filters boilerplate emails via isBoilerplateEmail", () => {
  assert.match(source, /isBoilerplateEmail/);
  assert.match(source, /noreply@/);
  assert.match(source, /example\.com/);
});

// (j) result type includes emails, phones, socialLinks
test("ApifyWebsiteResult includes emails, phones, socialLinks fields", () => {
  assert.match(source, /emails:\s*string\[\]/);
  assert.match(source, /phones:\s*string\[\]/);
  assert.match(source, /socialLinks:\s*\{/);
});
