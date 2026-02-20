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
  assert.match(dataFreshnessSource, /overwrite:\s*hasBeenEnriched\s*\?\s*true\s*:\s*undefined/);
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

// --- Pipeline: Sonar enrichment ---

test("orchestrator calls Sonar enrichment with lead details", () => {
  assert.match(orchestratorSource, /api\.enrichment\.sonarEnrich\.enrichWithSonar/);
  assert.match(orchestratorSource, /name:\s*lead\.name/);
});

// --- Pipeline: phone is filled from Google Places ---

test("orchestrator fills contactPhone from Google Places result", () => {
  assert.match(orchestratorSource, /patch\.contactPhone\s*=\s*placesResult\.phone/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("contactPhone"\)/);
});

test("phone is only filled when empty or forced", () => {
  assert.match(orchestratorSource, /!lead\.contactPhone\s*\|\|\s*overwrite.*placesResult\.phone/s);
});

// --- Pipeline: products are filled from Sonar ---

test("orchestrator fills products from Sonar result", () => {
  assert.match(orchestratorSource, /patch\.products\s*=\s*sonarResult\.products/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("products"\)/);
});

test("products are only filled when empty or forced", () => {
  assert.match(orchestratorSource, /!lead\.products\s*\|\|\s*lead\.products\.length\s*===\s*0\s*\|\|\s*overwrite/);
});

// --- Pipeline: salesChannels are filled from Sonar ---

test("orchestrator fills salesChannels from Sonar result", () => {
  assert.match(orchestratorSource, /patch\.salesChannels\s*=\s*sonarResult\.salesChannels/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("salesChannels"\)/);
});

// --- Pipeline: sellsOnline is filled from Sonar ---

test("orchestrator fills sellsOnline from Sonar result", () => {
  assert.match(orchestratorSource, /patch\.sellsOnline\s*=\s*sonarResult\.sellsOnline/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("sellsOnline"\)/);
});

// --- Pipeline: farmDescription is filled from Sonar ---

test("orchestrator fills farmDescription from Sonar result", () => {
  assert.match(orchestratorSource, /patch\.farmDescription\s*=\s*sonarResult\.businessDescription/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("farmDescription"\)/);
});

// --- Pipeline: contactName is filled from Sonar ---

test("orchestrator fills contactName from Sonar result", () => {
  assert.match(orchestratorSource, /sonarResult\?\.contactName/);
  assert.match(orchestratorSource, /patch\.contactName\s*=\s*sonarResult\.contactName/);
});

// --- Pipeline: email is filled from Sonar ---

test("orchestrator fills contactEmail from Sonar result", () => {
  assert.match(orchestratorSource, /sonarResult\?\.contactEmail/);
  assert.match(orchestratorSource, /sonar - /);
});

test("orchestrator tracks email source for consent", () => {
  assert.match(orchestratorSource, /emailSource/);
  assert.match(orchestratorSource, /consentSource/);
});

// --- Pipeline: email is filled from Apify Website (highest priority) ---

test("orchestrator fills email from apifyWebsiteResult before sonarResult", () => {
  assert.match(orchestratorSource, /apifyWebsiteResult\?\.emails\?\.\[0\]/);
  assert.match(orchestratorSource, /bestEmail\s*=\s*apifyWebsiteResult\.emails\[0\]/);
  assert.match(orchestratorSource, /emailSource\s*=\s*`apify_website/);
});

// --- Pipeline: social links are filled from Apify Website (highest priority) ---

test("orchestrator fills social links from apifyWebsiteResult", () => {
  assert.match(orchestratorSource, /apifyWebsiteResult\?\.socialLinks\?\.facebook/);
  assert.match(orchestratorSource, /newSocial\.facebook\s*=\s*apifyWebsiteResult\.socialLinks\.facebook/);
  assert.match(orchestratorSource, /apifyWebsiteResult\?\.socialLinks\?\.instagram/);
  assert.match(orchestratorSource, /newSocial\.instagram\s*=\s*apifyWebsiteResult\.socialLinks\.instagram/);
});

// --- Pipeline: apifySocial provides fallback for email, phone, and website ---

test("orchestrator fills email from apifySocialResult as fallback", () => {
  assert.match(orchestratorSource, /apifySocialResult\?\.email/);
  assert.match(orchestratorSource, /bestEmail\s*=\s*apifySocialResult\.email/);
  assert.match(orchestratorSource, /emailSource\s*=\s*`apify_social/);
});

test("orchestrator fills phone from apifySocialResult as fallback", () => {
  assert.match(orchestratorSource, /apifySocialResult\?\.phone\s*&&\s*!patch\.contactPhone/);
  assert.match(orchestratorSource, /patch\.contactPhone\s*=\s*apifySocialResult\.phone/);
});

test("orchestrator fills website from apifySocialResult", () => {
  assert.match(orchestratorSource, /apifySocialResult\.website/);
  assert.match(orchestratorSource, /websiteUrl\s*=\s*apifySocialResult\.website/);
});

// --- Pipeline: social links are filled from Sonar ---

test("orchestrator fills social links from Sonar result", () => {
  assert.match(orchestratorSource, /sonarResult\.socialLinks\.facebook/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("socialLinks"\)/);
});

// --- Pipeline: website is filled from Google Places if missing ---

test("orchestrator fills website from Google Places if lead has none", () => {
  assert.match(orchestratorSource, /!websiteUrl\s*&&\s*placesResult\.website/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("website"\)/);
});

// --- Pipeline: locationDescription is filled from Sonar ---

test("orchestrator fills locationDescription from Sonar result", () => {
  assert.match(orchestratorSource, /patch\.locationDescription\s*=\s*sonarResult\.locationDescription/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("locationDescription"\)/);
});

test("locationDescription is only filled when empty or forced", () => {
  assert.match(orchestratorSource, /sonarResult\?\.locationDescription\s*&&\s*\(!lead\.locationDescription\s*\|\|\s*overwrite\)/);
});

// --- Pipeline: imagePrompt is filled from Sonar ---

test("orchestrator fills imagePrompt from Sonar result", () => {
  assert.match(orchestratorSource, /patch\.imagePrompt\s*=\s*sonarResult\.imagePrompt/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("imagePrompt"\)/);
});

test("imagePrompt is only filled when empty or forced", () => {
  assert.match(orchestratorSource, /sonarResult\?\.imagePrompt\s*&&\s*\(!lead\.imagePrompt\s*\|\|\s*overwrite\)/);
});

// --- Pipeline: structured data from Sonar ---

test("orchestrator fills structured data from Sonar result", () => {
  assert.match(orchestratorSource, /sonarResult\.structuredProducts/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("enrichmentData\.structuredProducts"\)/);
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

// --- Sonar enrichment extracts products and business data ---

const sonarSource = fs.readFileSync(
  "convex/enrichment/sonarEnrich.ts",
  "utf8",
);

test("Sonar enrichment result includes products field", () => {
  assert.match(sonarSource, /products:\s*string\[\]/);
  assert.match(sonarSource, /SonarEnrichResult/);
});

test("Sonar enrichment result includes salesChannels field", () => {
  assert.match(sonarSource, /salesChannels:\s*string\[\]/);
});

test("Sonar enrichment result includes sellsOnline field", () => {
  assert.match(sonarSource, /sellsOnline:\s*boolean/);
});

test("Sonar enrichment result includes businessDescription field", () => {
  assert.match(sonarSource, /businessDescription:\s*string/);
});

test("Sonar enrichment result includes contactName field", () => {
  assert.match(sonarSource, /contactName:\s*string\s*\|\s*null/);
});

test("Sonar enrichment result includes contactEmail field", () => {
  assert.match(sonarSource, /contactEmail:\s*string\s*\|\s*null/);
});

test("Sonar enrichment result includes socialLinks field", () => {
  assert.match(sonarSource, /socialLinks:\s*\{/);
  assert.match(sonarSource, /facebook:\s*string\s*\|\s*null/);
  assert.match(sonarSource, /instagram:\s*string\s*\|\s*null/);
});

test("Sonar enrichment result includes locationDescription field", () => {
  assert.match(sonarSource, /locationDescription:\s*string/);
});

test("Sonar enrichment result includes imagePrompt field", () => {
  assert.match(sonarSource, /imagePrompt:\s*string/);
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
