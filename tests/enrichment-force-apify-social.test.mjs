import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const orchestratorSource = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);

const apifyWebsiteSource = fs.readFileSync(
  "convex/enrichment/apifyWebsite.ts",
  "utf8",
);

const scriptSource = fs.readFileSync("scripts/enrich-leads.ts", "utf8");

// =============================================================
// When re-enriching a lead that already has a website with
// --force, the Apify website scraper should run and discover
// social links (Facebook, Instagram) from the website HTML.
// =============================================================

// --- Force flag enables overwrite ---

test("force flag defaults overwrite to true", () => {
  assert.match(
    orchestratorSource,
    /const overwrite\s*=\s*args\.overwrite\s*\?\?\s*force/,
  );
});

test("force bypasses 30-day cooldown check", () => {
  assert.match(
    orchestratorSource,
    /!force\s*&&\s*lead\.enrichedAt\s*&&\s*Date\.now\(\)/,
  );
});

// --- Apify website scraper runs when websiteUrl exists ---

test("Apify website scraper runs when useApify is not false and websiteUrl exists", () => {
  const step3c = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3c:"),
    orchestratorSource.indexOf("// Step 4:"),
  );
  assert.match(step3c, /args\.useApify\s*!==\s*false/);
  assert.match(step3c, /websiteUrl/);
  assert.match(step3c, /api\.enrichment\.apifyWebsite\.scrapeContacts/);
});

test("Apify website scraper is called with the website URL", () => {
  const step3c = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3c:"),
    orchestratorSource.indexOf("// Step 4:"),
  );
  assert.match(step3c, /url:\s*websiteUrl/);
});

// --- Apify website scraper extracts social links ---

test("apifyWebsite result type includes socialLinks with facebook and instagram", () => {
  assert.match(apifyWebsiteSource, /socialLinks:\s*\{/);
  assert.match(apifyWebsiteSource, /facebook:\s*string\s*\|\s*null/);
  assert.match(apifyWebsiteSource, /instagram:\s*string\s*\|\s*null/);
});

test("apifyWebsite extracts Facebook URLs via regex", () => {
  assert.match(apifyWebsiteSource, /FACEBOOK_REGEX/);
  assert.match(apifyWebsiteSource, /facebook/);
  assert.match(apifyWebsiteSource, /findSocialLink\(item,\s*FACEBOOK_REGEX\)/);
});

test("apifyWebsite extracts Instagram URLs via regex", () => {
  assert.match(apifyWebsiteSource, /INSTAGRAM_REGEX/);
  assert.match(apifyWebsiteSource, /instagram/);
  assert.match(apifyWebsiteSource, /findSocialLink\(item,\s*INSTAGRAM_REGEX\)/);
});

test("findSocialLink searches JSON-serialized data for regex match", () => {
  assert.match(apifyWebsiteSource, /JSON\.stringify\(data\)/);
  assert.match(apifyWebsiteSource, /json\.match\(regex\)/);
});

// --- Apify website social links have highest merge priority ---

test("Apify website social links overwrite Sonar social links", () => {
  // Apify website block comes AFTER sonar block in the merge logic
  const socialBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Social links — priority:"),
    orchestratorSource.indexOf("// From Sonar — location description"),
  );
  const sonarFbPos = socialBlock.indexOf("sonarResult?.socialLinks?.facebook");
  const apifyFbPos = socialBlock.indexOf("apifyWebsiteResult?.socialLinks?.facebook");
  assert.ok(sonarFbPos >= 0, "Sonar facebook merge should exist in social block");
  assert.ok(apifyFbPos >= 0, "Apify facebook merge should exist in social block");
  assert.ok(
    sonarFbPos < apifyFbPos,
    "Sonar social links must be applied before Apify (so Apify overwrites)",
  );
});

test("social links merge respects overwrite flag for existing values", () => {
  assert.match(
    orchestratorSource,
    /!existingSocial\.facebook\s*\|\|\s*overwrite/,
  );
  assert.match(
    orchestratorSource,
    /!existingSocial\.instagram\s*\|\|\s*overwrite/,
  );
});

test("socialLinks is tracked in fieldsUpdated when updated", () => {
  assert.match(
    orchestratorSource,
    /fieldsUpdated\.push\("socialLinks"\)/,
  );
});

// --- Apify website adds to enrichment sources ---

test("Apify website result adds apify_website source with URL detail", () => {
  const step3c = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3c:"),
    orchestratorSource.indexOf("// Step 4:"),
  );
  assert.match(step3c, /source:\s*"apify_website"/);
  assert.match(step3c, /detail:\s*websiteUrl/);
});

// --- CLI passes force through to batch enrichment ---

test("CLI script passes force flag to batchEnrich action", () => {
  assert.match(scriptSource, /force,/);
});

test("CLI shows per-lead sources so Apify website can be verified", () => {
  assert.match(scriptSource, /r\.summary\.sources\.join/);
});

test("CLI shows per-lead fieldsUpdated so socialLinks can be verified", () => {
  assert.match(scriptSource, /r\.summary\.fieldsUpdated\.join/);
});

// --- Lead's existing website is used for Apify website step ---

test("orchestrator initializes websiteUrl from lead record", () => {
  assert.match(orchestratorSource, /let websiteUrl\s*=\s*lead\.website/);
});

test("websiteUrl is available for Apify website step even without Google Places", () => {
  // The Apify website step checks websiteUrl (which may come from lead.website directly)
  const step3c = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3c:"),
    orchestratorSource.indexOf("// Step 4:"),
  );
  assert.match(step3c, /websiteUrl/);
});
