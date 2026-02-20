import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const orchestratorSource = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);

// =============================================================
// Re-enrich a lead with no website but existing social links:
// Apify social scraper fires → discovers website URL →
// website scraper runs on discovered URL → website persisted
// =============================================================

// --- Step 3b: Apify Social (EARLY) fires when no website + social links exist ---

test("Apify social (early) fires when websiteUrl is missing and lead has social links", () => {
  const step3b = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3b:"),
    orchestratorSource.indexOf("// Step 3c:"),
  );
  assert.match(step3b, /!websiteUrl/);
  assert.match(step3b, /lead\.socialLinks\?\.facebook\s*\|\|\s*lead\.socialLinks\?\.instagram/);
  assert.match(step3b, /api\.enrichment\.apifySocial\.scrapeSocialPages/);
});

test("Apify social passes facebook URL and instagram username", () => {
  const step3b = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3b:"),
    orchestratorSource.indexOf("// Step 3c:"),
  );
  assert.match(step3b, /facebookUrl/);
  assert.match(step3b, /instagramUsername/);
});

test("Apify social extracts Instagram username from URL via regex", () => {
  const step3b = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3b:"),
    orchestratorSource.indexOf("// Step 3c:"),
  );
  assert.match(step3b, /igMatch\s*=\s*lead\.socialLinks\?\.instagram\?\.match/);
  assert.match(step3b, /instagramUsername\s*=\s*igMatch\s*\?\s*igMatch\[1\]/);
});

// --- Social scraper discovers website URL → sets websiteUrl ---

test("discovered website from social scraper updates websiteUrl pipeline variable", () => {
  const step3b = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3b:"),
    orchestratorSource.indexOf("// Step 3c:"),
  );
  assert.match(step3b, /apifySocialResult\.website/);
  assert.match(step3b, /websiteUrl\s*=\s*apifySocialResult\.website/);
});

// --- Step 3c: Website scraper fires on the discovered URL ---

test("website scraper runs after social scraper sets websiteUrl", () => {
  const step3bPos = orchestratorSource.indexOf("// Step 3b:");
  const step3cPos = orchestratorSource.indexOf("// Step 3c:");
  assert.ok(step3bPos >= 0, "Step 3b should exist");
  assert.ok(step3cPos >= 0, "Step 3c should exist");
  assert.ok(step3bPos < step3cPos, "Step 3b must execute before Step 3c");
});

test("website scraper condition uses websiteUrl which may come from social scraper", () => {
  const step3c = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3c:"),
    orchestratorSource.indexOf("// Step 4:"),
  );
  assert.match(step3c, /args\.useApify\s*!==\s*false\s*&&\s*websiteUrl/);
  assert.match(step3c, /url:\s*websiteUrl/);
});

// --- Merge: apifySocial website is persisted to lead's website field ---

test("apifySocial website is persisted to patch.website in merge section", () => {
  assert.match(
    orchestratorSource,
    /apifySocialResult\?\.website\s*&&\s*!patch\.website\s*&&\s*\(!lead\.website\s*\|\|\s*overwrite\)/,
  );
  assert.match(orchestratorSource, /patch\.website\s*=\s*apifySocialResult\.website/);
});

test("apifySocial website merge tracks fieldsUpdated", () => {
  // Find the apifySocial website merge block and check it pushes to fieldsUpdated
  const apifySocialMergeStart = orchestratorSource.indexOf(
    "// From Apify Social — website",
  );
  const sonarWebsiteMergeStart = orchestratorSource.indexOf(
    "// From Sonar — website",
  );
  assert.ok(apifySocialMergeStart >= 0, "Apify Social website merge comment should exist");
  assert.ok(sonarWebsiteMergeStart >= 0, "Sonar website merge comment should exist");
  const block = orchestratorSource.slice(apifySocialMergeStart, sonarWebsiteMergeStart);
  assert.match(block, /fieldsUpdated\.push\("website"\)/);
});

// --- Merge priority: Google Places > Apify Social > Sonar for website ---

test("website merge priority: Google Places before Apify Social before Sonar", () => {
  const placesWebsitePos = orchestratorSource.indexOf("patch.website = placesResult.website");
  const apifySocialWebsitePos = orchestratorSource.indexOf("patch.website = apifySocialResult.website");
  const sonarWebsitePos = orchestratorSource.indexOf("patch.website = sonarResult.website");
  assert.ok(placesWebsitePos >= 0, "Google Places website merge should exist");
  assert.ok(apifySocialWebsitePos >= 0, "Apify Social website merge should exist");
  assert.ok(sonarWebsitePos >= 0, "Sonar website merge should exist");
  assert.ok(
    placesWebsitePos < apifySocialWebsitePos,
    "Google Places website must be merged before Apify Social",
  );
  assert.ok(
    apifySocialWebsitePos < sonarWebsitePos,
    "Apify Social website must be merged before Sonar",
  );
});

test("apifySocial website only fills when patch.website is not already set", () => {
  assert.match(
    orchestratorSource,
    /apifySocialResult\?\.website\s*&&\s*!patch\.website/,
  );
});

// --- Scraped URLs are tracked to avoid duplicate social scraping ---

test("scraped social URLs are tracked in a Set to avoid re-scraping", () => {
  const step3b = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3b:"),
    orchestratorSource.indexOf("// Step 3c:"),
  );
  assert.match(step3b, /scrapedSocialUrls/);
  assert.match(step3b, /scrapedSocialUrls\.add/);
});

test("late social scraper (Step 4b) excludes already-scraped URLs", () => {
  const step4b = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 4b:"),
    orchestratorSource.indexOf("// Merge results"),
  );
  assert.match(step4b, /!scrapedSocialUrls\.has\(url\)/);
});

// --- apify_social is added to sources when early social scraper succeeds ---

test("apify_social source is recorded when early social scraper returns a result", () => {
  const step3b = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3b:"),
    orchestratorSource.indexOf("// Step 3c:"),
  );
  assert.match(step3b, /source:\s*"apify_social"/);
});
