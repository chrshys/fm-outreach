import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/orchestrator.ts", "utf8");

// --- Step 3b: Apify Social Scraper (EARLY) ---

test("Step 3b comment exists after Google Places block", () => {
  const placesEnd = source.indexOf("// Step 3b:");
  const step4 = source.indexOf("// Step 4:");
  assert.ok(placesEnd >= 0, "Step 3b comment should exist");
  assert.ok(step4 >= 0, "Step 4 comment should exist");
  assert.ok(placesEnd < step4, "Step 3b must come before Step 4");
});

test("Step 3b comes after Google Places block", () => {
  const step3 = source.indexOf("// Step 3: Google Places");
  const step3b = source.indexOf("// Step 3b:");
  assert.ok(step3 >= 0, "Step 3 comment should exist");
  assert.ok(step3b > step3, "Step 3b must come after Step 3");
});

// --- Condition: useApify !== false ---

test("checks useApify !== false before running", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /args\.useApify\s*!==\s*false/);
});

// --- Condition: no websiteUrl ---

test("only runs when websiteUrl is falsy", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /!websiteUrl/);
});

// --- Condition: lead has social links ---

test("checks for existing facebook or instagram social links", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /lead\.socialLinks\?\.facebook/);
  assert.match(step3bBlock, /lead\.socialLinks\?\.instagram/);
});

// --- Instagram username extraction ---

test("extracts Instagram username from URL with regex", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /instagram\\\.com/);
  assert.ok(
    step3bBlock.includes("[^/?#]+"),
    "should use character class to capture Instagram username",
  );
});

// --- Calls scrapeSocialPages ---

test("calls apifySocial.scrapeSocialPages action", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /api\.enrichment\.apifySocial\.scrapeSocialPages/);
});

test("passes facebookUrl and instagramUsername to scrapeSocialPages", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /facebookUrl/);
  assert.match(step3bBlock, /instagramUsername/);
});

// --- scrapedSocialUrls tracking ---

test("declares scrapedSocialUrls as a Set<string>", () => {
  assert.match(source, /const\s+scrapedSocialUrls\s*=\s*new\s+Set<string>\(\)/);
});

test("adds scraped URLs to scrapedSocialUrls set", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /scrapedSocialUrls\.add\(/);
});

// --- Website URL update ---

test("updates websiteUrl if social result has website", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /socialResult\.website/);
  assert.match(step3bBlock, /websiteUrl\s*=\s*socialResult\.website/);
});

// --- Source tracking ---

test("pushes apify_social source on success", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /source:\s*"apify_social"/);
  assert.match(step3bBlock, /fetchedAt:\s*Date\.now\(\)/);
});

// --- Error handling ---

test("Step 3b is wrapped in try/catch", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /try\s*\{/);
  assert.match(step3bBlock, /catch\s*\{/);
});

// --- Result typing ---

test("socialResult is typed as ApifySocialResult | null", () => {
  const step3bBlock = source.slice(
    source.indexOf("// Step 3b:"),
    source.indexOf("// Step 4:"),
  );
  assert.match(step3bBlock, /ApifySocialResult\s*\|\s*null/);
});
