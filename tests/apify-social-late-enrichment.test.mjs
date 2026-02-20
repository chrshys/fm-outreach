import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/orchestrator.ts", "utf8");

const step4bBlock = source.slice(
  source.indexOf("// Step 4b:"),
  source.indexOf("// Merge results"),
);

// --- Step ordering ---

test("Step 4b comment exists after Sonar block", () => {
  const step4 = source.indexOf("// Step 4: Sonar enrichment");
  const step4b = source.indexOf("// Step 4b:");
  const merge = source.indexOf("// Merge results");
  assert.ok(step4 >= 0, "Step 4 comment should exist");
  assert.ok(step4b >= 0, "Step 4b comment should exist");
  assert.ok(merge >= 0, "Merge results comment should exist");
  assert.ok(step4b > step4, "Step 4b must come after Step 4");
  assert.ok(step4b < merge, "Step 4b must come before Merge results");
});

// --- Gate conditions ---

test("checks useApify !== false before running", () => {
  assert.match(step4bBlock, /args\.useApify\s*!==\s*false/);
});

test("checks lead has no existing contactEmail", () => {
  assert.match(step4bBlock, /!lead\.contactEmail/);
});

test("checks apifyWebsiteResult has no emails", () => {
  assert.match(step4bBlock, /!\(apifyWebsiteResult\?\.emails\?\.length\)/);
});

test("checks sonarResult has no contactEmail", () => {
  assert.match(step4bBlock, /!sonarResult\?\.contactEmail/);
});

test("checks apifySocialResult has no email from early scrape", () => {
  assert.match(step4bBlock, /!apifySocialResult\?\.email/);
});

// --- URL collection ---

test("collects Facebook URLs from apifyWebsiteResult, sonarResult, and lead", () => {
  assert.match(step4bBlock, /apifyWebsiteResult\?\.socialLinks\?\.facebook/);
  assert.match(step4bBlock, /sonarResult\?\.socialLinks\?\.facebook/);
  assert.match(step4bBlock, /lead\.socialLinks\?\.facebook/);
});

test("collects Instagram URLs from apifyWebsiteResult, sonarResult, and lead", () => {
  assert.match(step4bBlock, /apifyWebsiteResult\?\.socialLinks\?\.instagram/);
  assert.match(step4bBlock, /sonarResult\?\.socialLinks\?\.instagram/);
  assert.match(step4bBlock, /lead\.socialLinks\?\.instagram/);
});

test("filters out already-scraped URLs using scrapedSocialUrls set", () => {
  assert.match(step4bBlock, /!scrapedSocialUrls\.has\(url\)/);
});

// --- Instagram username extraction ---

test("extracts Instagram username from URL with regex", () => {
  assert.match(step4bBlock, /instagram\\\.com/);
  assert.ok(
    step4bBlock.includes("[^/?#]+"),
    "should use character class to capture Instagram username",
  );
});

// --- Calls scrapeSocialPages ---

test("calls apifySocial.scrapeSocialPages action", () => {
  assert.match(step4bBlock, /api\.enrichment\.apifySocial\.scrapeSocialPages/);
});

test("passes lateFacebookUrl and lateInstagramUsername to scrapeSocialPages", () => {
  assert.match(step4bBlock, /facebookUrl:\s*lateFacebookUrl/);
  assert.match(step4bBlock, /instagramUsername:\s*lateInstagramUsername/);
});

test("only calls scrapeSocialPages if there are unscraped URLs", () => {
  assert.match(step4bBlock, /if\s*\(lateFacebookUrl\s*\|\|\s*lateInstagramUsername\)/);
});

// --- Merge logic ---

test("merges late result into apifySocialResult — fill gaps only", () => {
  assert.match(step4bBlock, /!apifySocialResult\.email\s*&&\s*lateResult\.email/);
  assert.match(step4bBlock, /!apifySocialResult\.phone\s*&&\s*lateResult\.phone/);
  assert.match(step4bBlock, /!apifySocialResult\.website\s*&&\s*lateResult\.website/);
});

test("assigns lateResult directly when apifySocialResult is null", () => {
  assert.match(step4bBlock, /if\s*\(!apifySocialResult\)/);
  assert.match(step4bBlock, /apifySocialResult\s*=\s*lateResult/);
});

// --- Source tracking ---

test("adds apify_social to sources only if not already present", () => {
  assert.match(step4bBlock, /sources\.some\(\(s\)\s*=>\s*s\.source\s*===\s*"apify_social"\)/);
  assert.match(step4bBlock, /source:\s*"apify_social"/);
  assert.match(step4bBlock, /fetchedAt:\s*Date\.now\(\)/);
});

// --- Error handling ---

test("Step 4b is wrapped in try/catch", () => {
  assert.match(step4bBlock, /try\s*\{/);
  assert.match(step4bBlock, /catch\s*\{/);
});

// --- Result typing ---

test("lateResult is typed as ApifySocialResult | null", () => {
  assert.match(step4bBlock, /ApifySocialResult\s*\|\s*null/);
});
