import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/orchestrator.ts", "utf8");

// --- Step 3c: Apify Website Scraper ---

test("Step 3c comment exists in orchestrator", () => {
  const step3c = source.indexOf("// Step 3c:");
  assert.ok(step3c >= 0, "Step 3c comment should exist");
});

test("Step 3c comes after Step 3b", () => {
  const step3b = source.indexOf("// Step 3b:");
  const step3c = source.indexOf("// Step 3c:");
  assert.ok(step3b >= 0, "Step 3b comment should exist");
  assert.ok(step3c > step3b, "Step 3c must come after Step 3b");
});

test("Step 3c comes before Step 4", () => {
  const step3c = source.indexOf("// Step 3c:");
  const step4 = source.indexOf("// Step 4:");
  assert.ok(step3c >= 0, "Step 3c comment should exist");
  assert.ok(step4 >= 0, "Step 4 comment should exist");
  assert.ok(step3c < step4, "Step 3c must come before Step 4");
});

// --- Condition: useApify !== false ---

test("Step 3c checks useApify !== false before running", () => {
  const step3cBlock = source.slice(
    source.indexOf("// Step 3c:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3cBlock, /args\.useApify\s*!==\s*false/);
});

// --- Condition: websiteUrl exists ---

test("Step 3c only runs when websiteUrl is truthy", () => {
  const step3cBlock = source.slice(
    source.indexOf("// Step 3c:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3cBlock, /&&\s*websiteUrl/);
});

// --- Calls scrapeContacts ---

test("Step 3c calls apifyWebsite.scrapeContacts action", () => {
  const step3cBlock = source.slice(
    source.indexOf("// Step 3c:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3cBlock, /api\.enrichment\.apifyWebsite\.scrapeContacts/);
});

test("Step 3c passes websiteUrl as url to scrapeContacts", () => {
  const step3cBlock = source.slice(
    source.indexOf("// Step 3c:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3cBlock, /url:\s*websiteUrl/);
});

// --- Source tracking ---

test("Step 3c pushes apify_website source on success", () => {
  const step3cBlock = source.slice(
    source.indexOf("// Step 3c:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3cBlock, /source:\s*"apify_website"/);
});

test("Step 3c includes websiteUrl as detail in source entry", () => {
  const step3cBlock = source.slice(
    source.indexOf("// Step 3c:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3cBlock, /detail:\s*websiteUrl/);
});

test("Step 3c includes fetchedAt timestamp in source entry", () => {
  const step3cBlock = source.slice(
    source.indexOf("// Step 3c:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3cBlock, /fetchedAt:\s*Date\.now\(\)/);
});

// --- Error handling ---

test("Step 3c is wrapped in try/catch", () => {
  const step3cBlock = source.slice(
    source.indexOf("// Step 3c:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3cBlock, /try\s*\{/);
  assert.match(step3cBlock, /catch\s*\{/);
});

// --- Result typing ---

test("Step 3c result is typed as ApifyWebsiteResult | null", () => {
  const step3cBlock = source.slice(
    source.indexOf("// Step 3c:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3cBlock, /ApifyWebsiteResult\s*\|\s*null/);
});

// --- Only pushes source when result is non-null ---

test("Step 3c only pushes source when result is non-null", () => {
  const step3cBlock = source.slice(
    source.indexOf("// Step 3c:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3cBlock, /if\s*\(apifyWebsiteResult\)/);
  assert.match(step3cBlock, /sources\.push\(/);
});
