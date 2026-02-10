import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const orchestratorSource = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);

const dataFreshnessSource = fs.readFileSync(
  "src/components/leads/data-freshness.tsx",
  "utf8",
);

const batchEnrichPublicSource = fs.readFileSync(
  "convex/enrichment/batchEnrichPublic.ts",
  "utf8",
);

const batchEnrichSource = fs.readFileSync(
  "convex/enrichment/batchEnrich.ts",
  "utf8",
);

const leadDetailSource = fs.readFileSync(
  "src/app/leads/[id]/page.tsx",
  "utf8",
);

// =============================================================
// Selecting a lead with a known website and clicking "Enrich"
// fills in additional fields (phone, products, etc.)
// =============================================================

// --- UI: Enrich button appears for never-enriched leads ---

test("DataFreshness shows 'Enrich' button for never-enriched leads", () => {
  assert.match(dataFreshnessSource, /hasBeenEnriched\s*\?\s*"Re-enrich"\s*:\s*"Enrich"/);
});

test("DataFreshness derives hasBeenEnriched from enrichedAt prop", () => {
  assert.match(dataFreshnessSource, /hasBeenEnriched\s*=\s*enrichedAt\s*!==\s*undefined/);
});

test("DataFreshness does not force when enriching for the first time", () => {
  assert.match(dataFreshnessSource, /force:\s*hasBeenEnriched\s*\?\s*true\s*:\s*undefined/);
});

test("DataFreshness calls batchEnrich with the lead ID", () => {
  assert.match(dataFreshnessSource, /leadIds:\s*\[leadId\]/);
});

// --- UI: Enrich button is on the lead detail page ---

test("lead detail page renders DataFreshness in a card", () => {
  assert.match(leadDetailSource, /<DataFreshness/);
  assert.match(leadDetailSource, /leadId=\{leadId\}/);
  assert.match(leadDetailSource, /enrichedAt=\{lead\.enrichedAt\}/);
});

// --- Pipeline: website triggers scraping ---

test("orchestrator scrapes website when URL exists", () => {
  assert.match(orchestratorSource, /if\s*\(websiteUrl\)/);
  assert.match(orchestratorSource, /scrapeWebsite/);
});

// --- Pipeline: phone is filled from Google Places ---

test("orchestrator fills contactPhone from Google Places result", () => {
  assert.match(orchestratorSource, /patch\.contactPhone\s*=\s*placesResult\.phone/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("contactPhone"\)/);
});

test("phone is only filled when empty or forced", () => {
  assert.match(orchestratorSource, /!lead\.contactPhone\s*\|\|\s*force.*placesResult\.phone/s);
});

// --- Pipeline: products are filled from Claude analysis ---

test("orchestrator fills products from Claude analysis", () => {
  assert.match(orchestratorSource, /patch\.products\s*=\s*claudeResult\.products/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("products"\)/);
});

test("products are only filled when empty or forced", () => {
  assert.match(orchestratorSource, /!lead\.products\s*\|\|\s*lead\.products\.length\s*===\s*0\s*\|\|\s*force/);
});

// --- Pipeline: salesChannels are filled from Claude analysis ---

test("orchestrator fills salesChannels from Claude analysis", () => {
  assert.match(orchestratorSource, /patch\.salesChannels\s*=\s*claudeResult\.salesChannels/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("salesChannels"\)/);
});

// --- Pipeline: sellsOnline is filled from Claude analysis ---

test("orchestrator fills sellsOnline from Claude analysis", () => {
  assert.match(orchestratorSource, /patch\.sellsOnline\s*=\s*claudeResult\.sellsOnline/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("sellsOnline"\)/);
});

// --- Pipeline: farmDescription is filled from Claude analysis ---

test("orchestrator fills farmDescription from Claude analysis", () => {
  assert.match(orchestratorSource, /patch\.farmDescription\s*=\s*claudeResult\.businessDescription/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("farmDescription"\)/);
});

// --- Pipeline: contactName is filled from Hunter or Claude ---

test("orchestrator fills contactName from Hunter result", () => {
  assert.match(orchestratorSource, /sorted\[0\]\.firstName/);
  assert.match(orchestratorSource, /patch\.contactName\s*=\s*name/);
});

test("orchestrator fills contactName from Claude as fallback", () => {
  assert.match(orchestratorSource, /claudeResult\.contactName/);
  assert.match(orchestratorSource, /!patch\.contactName/);
});

// --- Pipeline: email is filled from scraper or Hunter ---

test("orchestrator fills contactEmail from website scraper first", () => {
  assert.match(orchestratorSource, /scraperResult\.emails\[0\]/);
  assert.match(orchestratorSource, /website_scraper:/);
});

test("orchestrator falls back to Hunter email if scraper found none", () => {
  assert.match(orchestratorSource, /!bestEmail\s*&&\s*hunterResult/);
  assert.match(orchestratorSource, /sorted\[0\]\.email/);
});

test("orchestrator tracks email source for consent", () => {
  assert.match(orchestratorSource, /emailSource/);
  assert.match(orchestratorSource, /consentSource/);
});

// --- Pipeline: social links are filled from discovery ---

test("orchestrator fills social links from social discovery", () => {
  assert.match(orchestratorSource, /discoverSocialLinks/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("socialLinks"\)/);
});

// --- Pipeline: website is filled from Google Places if missing ---

test("orchestrator fills website from Google Places if lead has none", () => {
  assert.match(orchestratorSource, /!websiteUrl\s*&&\s*placesResult\.website/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("website"\)/);
});

// --- Pipeline: platform detection from scraper ---

test("orchestrator fills platform from website scraper", () => {
  assert.match(orchestratorSource, /scraperResult\?\.platform/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("enrichmentData\.platform"\)/);
});

// --- Pipeline: all changes are saved via leads.update ---

test("orchestrator saves all fields via leads.update mutation", () => {
  assert.match(orchestratorSource, /ctx\.runMutation\(api\.leads\.update/);
  assert.match(orchestratorSource, /\.\.\.patch/);
});

// --- Pipeline: status is updated ---

test("orchestrator sets status to enriched when email found", () => {
  assert.match(orchestratorSource, /emailFound\s*\?\s*"enriched"\s*:\s*"no_email"/);
});

// --- Batch action calls orchestrator ---

test("batchEnrich calls enrichLead for each lead", () => {
  assert.match(batchEnrichSource, /internal\.enrichment\.orchestrator\.enrichLead/);
});

test("batchEnrichPublic wraps internal batch action", () => {
  assert.match(batchEnrichPublicSource, /internal\.enrichment\.batchEnrich\.batchEnrichLeads/);
});

// --- Claude analysis extracts products and business data ---

const claudeSource = fs.readFileSync(
  "convex/enrichment/claudeAnalysis.ts",
  "utf8",
);

test("Claude analysis extracts products field", () => {
  assert.match(claudeSource, /products/);
  assert.match(claudeSource, /ClaudeAnalysisResult/);
});

test("Claude analysis extracts salesChannels field", () => {
  assert.match(claudeSource, /salesChannels/);
});

test("Claude analysis extracts sellsOnline field", () => {
  assert.match(claudeSource, /sellsOnline/);
});

test("Claude analysis extracts businessDescription field", () => {
  assert.match(claudeSource, /businessDescription/);
});

test("Claude analysis extracts contactName field", () => {
  assert.match(claudeSource, /contactName/);
});

// --- Website scraper extracts emails and social links ---

const scraperSource = fs.readFileSync(
  "convex/enrichment/websiteScraper.ts",
  "utf8",
);

test("website scraper extracts emails from HTML", () => {
  assert.match(scraperSource, /extractEmails/);
  assert.match(scraperSource, /EMAIL_REGEX/);
});

test("website scraper extracts social links from HTML", () => {
  assert.match(scraperSource, /extractSocialLinks/);
  assert.match(scraperSource, /FACEBOOK_REGEX/);
  assert.match(scraperSource, /INSTAGRAM_REGEX/);
});

test("website scraper detects platform (Shopify/Square)", () => {
  assert.match(scraperSource, /detectPlatform/);
  assert.match(scraperSource, /shopify/);
  assert.match(scraperSource, /square/);
});

// --- Google Places provides phone and website ---

const placesSource = fs.readFileSync(
  "convex/enrichment/googlePlaces.ts",
  "utf8",
);

test("Google Places returns phone number", () => {
  assert.match(placesSource, /phone:/);
  assert.match(placesSource, /formatted_phone_number/);
});

test("Google Places returns website URL", () => {
  assert.match(placesSource, /website:/);
});
