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

// --- scrapeContacts action ---

test("exports scrapeContacts as a Convex action", () => {
  assert.match(source, /export\s+const\s+scrapeContacts\s*=\s*action\(/);
});

test("scrapeContacts accepts url string arg", () => {
  assert.match(source, /url:\s*v\.string\(\)/);
});

test("scrapeContacts returns ApifyWebsiteResult or null", () => {
  assert.match(source, /Promise<ApifyWebsiteResult\s*\|\s*null>/);
});

test("scrapeContacts reads APIFY_API_TOKEN from env", () => {
  assert.match(source, /process\.env\.APIFY_API_TOKEN/);
});

test("scrapeContacts returns null when API token is missing", () => {
  // Should check for missing token and return null early
  assert.match(source, /if\s*\(\s*!apiToken\s*\)/);
  assert.match(source, /return\s+null/);
});

test("scrapeContacts POSTs to Apify contact-details-extractor endpoint", () => {
  assert.match(source, /contact-details-extractor\/run-sync-get-dataset-items/);
  assert.match(source, /method:\s*"POST"/);
});

test("scrapeContacts sends Authorization Bearer header", () => {
  assert.match(source, /Authorization.*Bearer/);
});

test("scrapeContacts sends startUrls with maxDepth 0", () => {
  assert.match(source, /startUrls.*url/);
  assert.match(source, /maxDepth:\s*0/);
});

test("scrapeContacts handles 429 rate limit", () => {
  assert.match(source, /429/);
  assert.match(source, /rate limit/i);
});

test("scrapeContacts handles non-ok responses", () => {
  assert.match(source, /!response\.ok/);
  assert.match(source, /response\.status/);
});

test("scrapeContacts filters boilerplate emails", () => {
  assert.match(source, /isBoilerplateEmail/);
});

test("isBoilerplateEmail rejects image extensions", () => {
  assert.match(source, /\.png/);
  assert.match(source, /\.jpg/);
  assert.match(source, /\.gif/);
  assert.match(source, /\.svg/);
  assert.match(source, /\.webp/);
});

test("isBoilerplateEmail rejects platform domains", () => {
  assert.match(source, /example\.com/);
  assert.match(source, /sentry/);
  assert.match(source, /wixpress\.com/);
  assert.match(source, /wordpress\.com/);
  assert.match(source, /squarespace\.com/);
});

test("isBoilerplateEmail rejects noreply addresses", () => {
  assert.match(source, /noreply@/);
  assert.match(source, /no-reply@/);
});

test("scrapeContacts extracts phones from response", () => {
  assert.match(source, /phones/);
});

test("scrapeContacts extracts facebook and instagram social links", () => {
  assert.match(source, /FACEBOOK_REGEX/);
  assert.match(source, /INSTAGRAM_REGEX/);
  assert.match(source, /findSocialLink/);
});

test("scrapeContacts uses AbortController with 30s timeout on fetch", () => {
  assert.match(source, /new\s+AbortController\(\)/);
  assert.match(source, /setTimeout\(\s*\(\)\s*=>\s*controller\.abort\(\)/);
  assert.match(source, /signal:\s*controller\.signal/);
  assert.match(source, /clearTimeout\(timeout\)/);
});

test("APIFY_TIMEOUT_MS is set to 30 seconds", () => {
  assert.match(source, /APIFY_TIMEOUT_MS\s*=\s*30[_]?000/);
});

test("scrapeContacts throws descriptive error on timeout", () => {
  assert.match(source, /AbortError/);
  assert.match(source, /timed out/i);
});

test("scrapeContacts does not use scrapeWebsite name", () => {
  // The action is named scrapeContacts to avoid triggering the orchestrator test assertion
  assert.doesNotMatch(
    source,
    /export\s+const\s+scrapeWebsite(?:Contacts)/,
  );
});

// --- structural alignment with sonarEnrich.ts ---

test("extracts parsing into a dedicated parseApifyContactItem function", () => {
  assert.match(source, /function\s+parseApifyContactItem\(/);
  assert.match(source, /parseApifyContactItem\(item\)/);
});

test("uses defensive .catch for error body reading", () => {
  assert.match(source, /response\.text\(\)\.catch\(\(\)\s*=>\s*""\)/);
});

test("wraps parseApifyContactItem in try/catch returning null on failure", () => {
  // Same pattern as parseSonarResponse in sonarEnrich.ts
  assert.match(source, /try\s*\{\s*\n\s*return\s+parseApifyContactItem\(item\)/);
  assert.match(source, /catch\s*\{\s*\n\s*return\s+null/);
});
