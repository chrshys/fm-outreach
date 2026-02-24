import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);

const helpersSource = fs.readFileSync(
  "convex/enrichment/orchestratorHelpers.ts",
  "utf8",
);

// --- Orchestrator action structure ---

test("enrichLead is exported as an internalAction", () => {
  assert.match(source, /export\s+const\s+enrichLead\s*=\s*internalAction\(/);
});

test("action accepts leadId and optional force, overwrite, useSonarPro, useApify args", () => {
  assert.match(source, /leadId:\s*v\.id\("leads"\)/);
  assert.match(source, /force:\s*v\.optional\(v\.boolean\(\)\)/);
  assert.match(source, /overwrite:\s*v\.optional\(v\.boolean\(\)\)/);
  assert.match(source, /useSonarPro:\s*v\.optional\(v\.boolean\(\)\)/);
  assert.match(source, /useApify:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("action returns EnrichmentSummary type", () => {
  assert.match(source, /export\s+type\s+EnrichmentSummary\s*=/);
  assert.match(source, /Promise<EnrichmentSummary>/);
});

test("EnrichmentSummary has correct fields", () => {
  assert.match(source, /leadId:\s*string/);
  assert.match(source, /skipped:\s*boolean/);
  assert.match(source, /sources:\s*string\[\]/);
  assert.match(source, /emailFound:\s*boolean/);
  assert.match(source, /status:\s*"enriched"\s*\|\s*"no_email"/);
  assert.match(source, /fieldsUpdated:\s*string\[\]/);
});

// --- Step 0: Unsubscribe block list ---

test("checks unsubscribe block list before enrichment", () => {
  assert.match(source, /api\.smartlead\.unsubscribe\.isUnsubscribed/);
  assert.match(source, /lead\.contactEmail/);
});

test("block list check happens before cooldown step", () => {
  const blockListPos = source.indexOf("// Step 0:");
  const cooldownPos = source.indexOf("// Step 1:");
  assert.ok(blockListPos >= 0, "Step 0 comment should exist");
  assert.ok(cooldownPos >= 0, "Step 1 comment should exist");
  assert.ok(blockListPos < cooldownPos, "block list check must come before cooldown step");
});

test("returns skipped: true when lead is on block list", () => {
  const blockListBlock = source.slice(
    source.indexOf("// Step 0: Check if lead"),
    source.indexOf("// Step 1:"),
  );
  assert.match(blockListBlock, /skipped:\s*true/);
  assert.match(blockListBlock, /sources:\s*\[\]/);
  assert.match(blockListBlock, /fieldsUpdated:\s*\[\]/);
});

test("logs enrichment_skipped activity when lead is on block list", () => {
  const blockListBlock = source.slice(
    source.indexOf("// Step 0: Check if lead"),
    source.indexOf("// Step 1:"),
  );
  assert.match(blockListBlock, /enrichment_skipped/);
  assert.match(blockListBlock, /block list/);
});

// --- Step 1: Cooldown check (currently disabled) ---

// TODO: re-enable when cooldown is restored
// test("checks cooldown — skips if enriched within 30 days and not forced", () => {
//   assert.match(source, /COOLDOWN_MS/);
//   assert.match(source, /30\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
//   assert.match(source, /lead\.enrichedAt/);
//   assert.match(source, /Date\.now\(\)\s*-\s*lead\.enrichedAt\s*<\s*COOLDOWN_MS/);
//   assert.match(source, /!force/);
// });

test("cooldown is currently disabled (commented out)", () => {
  assert.match(source, /TODO:?\s*re-enable cooldown/i);
  assert.match(source, /\/\/\s*const\s+COOLDOWN_MS/);
});

test("logs enrichment_skipped activity for block list", () => {
  assert.match(source, /enrichment_skipped/);
  assert.match(source, /Enrichment skipped/);
});

test("returns skipped: true for block list", () => {
  assert.match(source, /skipped:\s*true/);
});

// --- Step 2: Log start ---

test("logs enrichment_started activity", () => {
  assert.match(source, /enrichment_started/);
  assert.match(source, /Enrichment pipeline started/);
});

// --- Step 3: Google Places ---

test("runs Google Places if no placeId", () => {
  assert.match(source, /!lead\.placeId/);
  assert.match(source, /enrichFromGooglePlaces/);
  assert.match(source, /name:\s*lead\.name/);
  assert.match(source, /city:\s*lead\.city/);
  assert.match(source, /address:\s*lead\.address/);
});

test("gets website URL from Google Places if lead has none", () => {
  assert.match(source, /!websiteUrl\s*&&\s*placesResult\.website/);
  assert.match(source, /websiteUrl\s*=\s*placesResult\.website/);
});

test("adds google_places to sources when successful", () => {
  assert.match(source, /source:\s*"google_places"/);
});

// --- Step 3b/3c: Apify enrichment ---

test("calls Apify social scraper action", () => {
  assert.match(source, /api\.enrichment\.apifySocial\.scrapeSocialPages/);
});

test("calls Apify website scraper action", () => {
  assert.match(source, /api\.enrichment\.apifyWebsite\.scrapeContacts/);
});

test("adds apify_website to sources when successful", () => {
  assert.match(source, /source:\s*"apify_website"/);
});

test("adds apify_social to sources when successful", () => {
  assert.match(source, /source:\s*"apify_social"/);
});

// --- Step 4: Sonar enrichment ---

test("calls Sonar enrichment action with lead details", () => {
  assert.match(source, /api\.enrichment\.sonarEnrich\.enrichWithSonar/);
  assert.match(source, /name:\s*lead\.name/);
  assert.match(source, /address:\s*lead\.address/);
  assert.match(source, /city:\s*lead\.city/);
  assert.match(source, /province:\s*lead\.province/);
  assert.match(source, /type:\s*lead\.type/);
  assert.match(source, /website:\s*websiteUrl\s*\?\?\s*undefined/);
  assert.match(source, /useSonarPro:\s*args\.useSonarPro/);
});

test("stores sonarResult as SonarEnrichResult", () => {
  assert.match(source, /let\s+sonarResult:\s*SonarEnrichResult\s*\|\s*null\s*=\s*null/);
});

test("adds sonar_enrichment to sources when successful", () => {
  assert.match(source, /source:\s*"sonar_enrichment"/);
});

test("stores citations in source detail when available", () => {
  assert.match(source, /sonarResult\.citations\.length\s*>\s*0/);
  assert.match(source, /sourceEntry\.detail\s*=\s*sonarResult\.citations\.join/);
});

test("catches and continues on Sonar enrichment failure", () => {
  const sonarBlock = source.slice(
    source.indexOf("// Step 4: Sonar enrichment"),
    source.indexOf("// Step 4b:"),
  );
  assert.match(sonarBlock, /try\s*\{/);
  assert.match(sonarBlock, /catch\s*\{/);
});

// --- Merge results ---

test("only overwrites empty fields unless forced", () => {
  assert.match(source, /!lead\.contactPhone\s*\|\|\s*overwrite/);
  assert.match(source, /!lead\.website\s*\|\|\s*overwrite/);
  assert.match(source, /!lead\.contactEmail\s*\|\|\s*overwrite/);
  assert.match(source, /!lead\.contactName\s*\|\|\s*overwrite/);
  assert.match(source, /!lead\.farmDescription\s*\|\|\s*overwrite/);
});

test("merges hours from Google Places using parseWeekdayText", () => {
  // Checks that hours merge is guarded by empty/overwrite
  assert.match(source, /!lead\.hours\s*\|\|\s*lead\.hours\.length\s*===\s*0\s*\|\|\s*overwrite/);
  // Parses raw weekday_text via parseWeekdayText
  assert.match(source, /parseWeekdayText\(placesResult\.hours\)/);
  // Only patches when parsed array is non-empty
  assert.match(source, /parsed\.length\s*>\s*0/);
  // Sets patch.hours to parsed result
  assert.match(source, /patch\.hours\s*=\s*parsed/);
  // Tracks fieldsUpdated
  assert.match(source, /fieldsUpdated\.push\("hours"\)/);
});

test("hours merge is inside the Google Places merge block", () => {
  const gpMergeStart = source.indexOf("// From Google Places");
  const gpMergeEnd = source.indexOf("// Email");
  assert.ok(gpMergeStart >= 0, "Google Places merge comment should exist");
  assert.ok(gpMergeEnd >= 0, "Email merge comment should exist");
  const gpBlock = source.slice(gpMergeStart, gpMergeEnd);
  assert.match(gpBlock, /patch\.hours\s*=\s*parsed/);
});

test("email priority: apifyWebsite > apifySocial > sonar", () => {
  // apifyWebsiteResult.emails[0] is checked first
  assert.match(source, /apifyWebsiteResult\?\.emails\?\.\[0\]/);
  // apifySocialResult.email is checked second
  assert.match(source, /apifySocialResult\?\.email/);
  // sonarResult.contactEmail is checked last
  assert.match(source, /sonarResult\?\.contactEmail/);
  assert.match(source, /bestEmail\s*=\s*sonarResult\.contactEmail/);
});

test("merges contact name from sonarResult", () => {
  assert.match(source, /sonarResult\?\.contactName/);
  assert.match(source, /patch\.contactName\s*=\s*sonarResult\.contactName/);
});

test("merges contact phone: Google Places > sonar > apifySocial", () => {
  assert.match(source, /sonarResult\?\.contactPhone\s*&&\s*!patch\.contactPhone/);
  assert.match(source, /apifySocialResult\?\.phone\s*&&\s*!patch\.contactPhone/);
});

test("merges website from apifySocialResult before sonarResult", () => {
  assert.match(source, /apifySocialResult\?\.website\s*&&\s*!patch\.website/);
  assert.match(source, /patch\.website\s*=\s*apifySocialResult\.website/);
});

test("merges website from sonarResult as fallback", () => {
  assert.match(source, /sonarResult\?\.website\s*&&\s*!patch\.website/);
});

test("merges products from sonarResult", () => {
  assert.match(source, /sonarResult\.products\.length\s*>\s*0/);
  assert.match(source, /patch\.products\s*=\s*sonarResult\.products/);
});

test("merges social links with apifyWebsite > websiteScraper > sonar priority", () => {
  assert.match(source, /existingSocial\s*=\s*lead\.socialLinks\s*\?\?\s*\{\}/);
  // Sonar social links applied first (lowest priority)
  assert.match(source, /sonarResult\?\.socialLinks\?\.facebook/);
  assert.match(source, /sonarResult\?\.socialLinks\?\.instagram/);
  // Website scraper fallback applied second (medium priority)
  assert.match(source, /websiteScraperResult\?\.socialLinks\?\.facebook\?\.\[0\]/);
  assert.match(source, /websiteScraperResult\?\.socialLinks\?\.instagram\?\.\[0\]/);
  // Apify website social links applied last (highest priority, overwrites all)
  assert.match(source, /apifyWebsiteResult\?\.socialLinks\?\.facebook/);
  assert.match(source, /apifyWebsiteResult\?\.socialLinks\?\.instagram/);
  assert.match(source, /\.\.\.existingSocial/);
  assert.match(source, /\.\.\.newSocial/);
});

test("merges locationDescription from sonarResult", () => {
  assert.match(source, /sonarResult\?\.locationDescription/);
  assert.match(source, /patch\.locationDescription\s*=\s*sonarResult\.locationDescription/);
  assert.match(source, /!lead\.locationDescription\s*\|\|\s*overwrite/);
  assert.match(source, /fieldsUpdated\.push\("locationDescription"\)/);
});

test("merges imagePrompt from sonarResult", () => {
  assert.match(source, /sonarResult\?\.imagePrompt/);
  assert.match(source, /patch\.imagePrompt\s*=\s*sonarResult\.imagePrompt/);
  assert.match(source, /!lead\.imagePrompt\s*\|\|\s*overwrite/);
  assert.match(source, /fieldsUpdated\.push\("imagePrompt"\)/);
});

test("merges structured data from sonarResult", () => {
  assert.match(source, /sonarResult\.structuredProducts\.length\s*>\s*0/);
  assert.match(source, /sonarResult\.structuredDescription\.specialties\.length\s*>\s*0/);
  assert.match(source, /structuredProducts:\s*sonarResult\.structuredProducts/);
  assert.match(source, /structuredDescription:\s*sonarResult\.structuredDescription/);
});

test("tracks fieldsUpdated for each modified field", () => {
  assert.match(source, /fieldsUpdated\.push\("placeId"\)/);
  assert.match(source, /fieldsUpdated\.push\("contactEmail"\)/);
  assert.match(source, /fieldsUpdated\.push\("products"\)/);
  assert.match(source, /fieldsUpdated\.push\("socialLinks"\)/);
});

// --- Step 5: Enrichment metadata ---

test("sets enrichedAt timestamp", () => {
  assert.match(source, /patch\.enrichedAt\s*=\s*now/);
});

test("sets enrichmentVersion", () => {
  assert.match(source, /ENRICHMENT_VERSION/);
  assert.match(source, /patch\.enrichmentVersion\s*=\s*ENRICHMENT_VERSION/);
});

test("ENRICHMENT_VERSION is 3.0", () => {
  assert.match(source, /const ENRICHMENT_VERSION\s*=\s*"3\.0"/);
});

test("appends to enrichmentSources array", () => {
  assert.match(source, /lead\.enrichmentSources\s*\?\?\s*\[\]/);
  assert.match(source, /\.\.\.sources/);
  assert.match(source, /patch\.enrichmentSources/);
});

// --- Step 6: Status ---

test("sets status to enriched if email found, no_email otherwise", () => {
  assert.match(source, /emailFound\s*\?\s*"enriched"\s*:\s*"no_email"/);
});

test("only updates status for progressable statuses unless forced", () => {
  assert.match(source, /progressableStatuses/);
  assert.match(source, /new_lead/);
  assert.match(source, /no_email/);
  assert.match(source, /progressableStatuses\.has\(lead\.status\)\s*\|\|\s*overwrite/);
});

// --- Step 7: Consent source ---

test("sets consentSource with source-specific emailSource patterns", () => {
  assert.match(source, /consentSource/);
  assert.match(source, /emailSource/);
  // apify_website pattern includes URL
  assert.match(source, /apify_website - /);
  // apify_social pattern includes date
  assert.match(source, /apify_social - /);
  // sonar pattern includes lead name and date
  assert.match(source, /sonar - /);
  assert.match(source, /toISOString\(\)\.slice\(0,\s*10\)/);
});

test("only sets consentSource when email is found (emailSource is non-null)", () => {
  assert.match(source, /let emailSource:\s*string\s*\|\s*null\s*=\s*null/);
  assert.match(source, /if\s*\(emailSource\s*&&/);
});

test("does not overwrite existing consentSource unless forced", () => {
  assert.match(source, /!lead\.consentSource\s*\|\|\s*overwrite/);
});

// --- Step 8: Log finished ---

test("logs enrichment_finished activity with summary", () => {
  assert.match(source, /enrichment_finished/);
  assert.match(source, /Enrichment completed:/);
  assert.match(source, /sources\.length/);
  assert.match(source, /fieldsUpdated\.length/);
  assert.match(source, /email found/);
});

test("finished activity metadata includes sources, fieldsUpdated, emailFound, status", () => {
  assert.match(source, /sources:\s*sources\.map/);
  assert.match(source, /fieldsUpdated/);
  assert.match(source, /emailFound/);
  assert.match(source, /status:\s*newStatus/);
});

// --- Error handling ---

test("catches and continues on Google Places failure", () => {
  const placesBlock = source.slice(
    source.indexOf("// Step 3: Google Places"),
    source.indexOf("// Step 3b:"),
  );
  assert.match(placesBlock, /try\s*\{/);
  assert.match(placesBlock, /catch\s*\{/);
});

// --- Lead validation ---

test("throws error if lead not found", () => {
  assert.match(source, /Lead not found/);
  assert.match(source, /throw\s+new\s+Error/);
});

test("fetches lead by ID at start", () => {
  assert.match(source, /ctx\.runQuery\(api\.leads\.get/);
  assert.match(source, /leadId:\s*args\.leadId/);
});

// --- Applies patch via leads.update ---

test("applies patch using leads.update mutation", () => {
  assert.match(source, /ctx\.runMutation\(api\.leads\.update/);
  assert.match(source, /leadId:\s*args\.leadId/);
  assert.match(source, /\.\.\.patch/);
});

// --- Imports ---

test("imports from enrichment modules", () => {
  assert.match(source, /import.*GooglePlacesResult.*from.*googlePlaces/);
  assert.match(source, /import.*SonarEnrichResult.*from.*sonarEnrich/);
  assert.match(source, /import.*ApifyWebsiteResult.*from.*apifyWebsite/);
  assert.match(source, /import.*ApifySocialResult.*from.*apifySocial/);
  assert.match(source, /import.*WebsiteScraperResult.*from.*websiteScraper/);
});

test("imports parseWeekdayText from googlePlaces", () => {
  assert.match(source, /import\s*\{[^}]*parseWeekdayText[^}]*\}\s*from\s*["']\.\/googlePlaces["']/);
});

test("does not import removed enrichment modules", () => {
  assert.doesNotMatch(source, /import.*HunterResult.*from.*hunter/);
  assert.doesNotMatch(source, /import.*ClaudeAnalysisResult.*from.*claudeAnalysis/);
  assert.doesNotMatch(source, /import.*discoverSocialLinks.*from.*socialDiscovery/);
});

test("does not reference removed enrichment steps", () => {
  assert.doesNotMatch(source, /searchDomain/);
  assert.doesNotMatch(source, /analyzeWithClaude/);
  assert.doesNotMatch(source, /discoverSocialLinks/);
  assert.doesNotMatch(source, /extractDomain/);
});

test("imports internalAction from generated server", () => {
  assert.match(source, /import.*internalAction.*from.*_generated\/server/);
});

test("imports api and internal from generated api", () => {
  assert.match(source, /import.*api.*internal.*from.*_generated\/api/);
});

// --- orchestratorHelpers ---

test("orchestratorHelpers exports logActivity as internalMutation", () => {
  assert.match(helpersSource, /export\s+const\s+logActivity\s*=\s*internalMutation\(/);
});

test("logActivity accepts enrichment activity types", () => {
  assert.match(helpersSource, /enrichment_started/);
  assert.match(helpersSource, /enrichment_finished/);
  assert.match(helpersSource, /enrichment_skipped/);
  assert.match(helpersSource, /enrichment_source_added/);
});

test("logActivity accepts leadId, type, description, and optional metadata", () => {
  assert.match(helpersSource, /leadId:\s*v\.id\("leads"\)/);
  assert.match(helpersSource, /type:\s*v\.union\(/);
  assert.match(helpersSource, /description:\s*v\.string\(\)/);
  assert.match(helpersSource, /metadata:\s*v\.optional\(v\.any\(\)\)/);
});

test("logActivity updates lead updatedAt", () => {
  assert.match(helpersSource, /ctx\.db\.patch\(args\.leadId/);
  assert.match(helpersSource, /updatedAt:\s*now/);
});

test("logActivity inserts into activities table", () => {
  assert.match(helpersSource, /ctx\.db\.insert\("activities"/);
});

test("logActivity validates lead exists", () => {
  assert.match(helpersSource, /Lead not found/);
  assert.match(helpersSource, /ctx\.db\.get\(args\.leadId\)/);
});
