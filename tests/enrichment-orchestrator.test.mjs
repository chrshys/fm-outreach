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

test("action accepts leadId and optional force args", () => {
  assert.match(source, /leadId:\s*v\.id\("leads"\)/);
  assert.match(source, /force:\s*v\.optional\(v\.boolean\(\)\)/);
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

// --- Step 1: Cooldown check ---

test("checks cooldown — skips if enriched within 30 days and not forced", () => {
  assert.match(source, /COOLDOWN_MS/);
  assert.match(source, /30\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(source, /lead\.enrichedAt/);
  assert.match(source, /Date\.now\(\)\s*-\s*lead\.enrichedAt\s*<\s*COOLDOWN_MS/);
  assert.match(source, /!force/);
});

test("logs enrichment_skipped activity when cooldown applies", () => {
  assert.match(source, /enrichment_skipped/);
  assert.match(source, /Enrichment skipped/);
});

test("returns skipped: true when cooldown applies", () => {
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

// --- Step 4: Website scraper ---

test("runs website scraper if website URL exists", () => {
  assert.match(source, /if\s*\(websiteUrl\)/);
  assert.match(source, /scrapeWebsite/);
  assert.match(source, /url:\s*websiteUrl/);
});

test("adds website_scraper to sources when successful", () => {
  assert.match(source, /source:\s*"website_scraper"/);
});

// --- Step 5: Hunter.io ---

test("runs Hunter.io if domain found and no email yet", () => {
  assert.match(source, /extractDomain/);
  assert.match(source, /domain\s*&&\s*!hasEmail/);
  assert.match(source, /searchDomain/);
});

test("extracts domain from URL correctly", () => {
  assert.match(source, /function\s+extractDomain\(/);
  assert.match(source, /new\s+URL\(url\)/);
  assert.match(source, /hostname/);
  assert.match(source, /replace\(\/\^www\\\.\//);
});

test("skips Hunter if scraper already found email", () => {
  assert.match(source, /lead\.contactEmail\s*\|\|.*scraperResult.*emails\.length\s*>\s*0/);
});

test("adds hunter to sources when emails found", () => {
  assert.match(source, /source:\s*"hunter"/);
});

// --- Step 6: Claude analysis ---

test("runs Claude analysis if website content was scraped", () => {
  assert.match(source, /if\s*\(scraperResult\)/);
  assert.match(source, /analyzeWithClaude/);
  assert.match(source, /content:\s*websiteHtml/);
});

test("fetches website HTML for Claude analysis and social discovery", () => {
  assert.match(source, /fetch\(websiteUrl/);
  assert.match(source, /FruitlandBot/);
  assert.match(source, /text\/html/);
  assert.match(source, /websiteHtml\s*=\s*await\s+response\.text\(\)/);
});

test("adds claude_analysis to sources when successful", () => {
  assert.match(source, /source:\s*"claude_analysis"/);
});

// --- Step 7: Social discovery ---

test("runs social discovery with website HTML and Google Places website", () => {
  assert.match(source, /discoverSocialLinks\(/);
  assert.match(source, /websiteHtml/);
  assert.match(source, /googlePlacesWebsite:\s*placesResult\?\.website/);
});

test("adds social_discovery to sources when links found", () => {
  assert.match(source, /source:\s*"social_discovery"/);
  assert.match(source, /socialResult\.facebook\s*\|\|\s*socialResult\.instagram/);
});

// --- Step 8: Merge results ---

test("only overwrites empty fields unless forced", () => {
  // Check that various field assignments guard on empty + force
  assert.match(source, /!lead\.contactPhone\s*\|\|\s*force/);
  assert.match(source, /!lead\.website\s*\|\|\s*force/);
  assert.match(source, /!lead\.contactEmail\s*\|\|\s*force/);
  assert.match(source, /!lead\.contactName\s*\|\|\s*force/);
  assert.match(source, /!lead\.farmDescription\s*\|\|\s*force/);
});

test("picks website scraper email first, then Hunter highest confidence", () => {
  assert.match(source, /scraperResult\.emails\[0\]/);
  assert.match(source, /\.sort\(/);
  assert.match(source, /b\.confidence\s*-\s*a\.confidence/);
  assert.match(source, /sorted\[0\]\.email/);
});

test("merges social links preserving existing values", () => {
  assert.match(source, /existingSocial\s*=\s*lead\.socialLinks\s*\?\?\s*\{\}/);
  assert.match(source, /\.\.\.existingSocial/);
  assert.match(source, /\.\.\.newSocial/);
});

test("tracks fieldsUpdated for each modified field", () => {
  assert.match(source, /fieldsUpdated\.push\("placeId"\)/);
  assert.match(source, /fieldsUpdated\.push\("contactEmail"\)/);
  assert.match(source, /fieldsUpdated\.push\("products"\)/);
  assert.match(source, /fieldsUpdated\.push\("socialLinks"\)/);
});

// --- Step 9: Enrichment metadata ---

test("sets enrichedAt timestamp", () => {
  assert.match(source, /patch\.enrichedAt\s*=\s*now/);
});

test("sets enrichmentVersion", () => {
  assert.match(source, /ENRICHMENT_VERSION/);
  assert.match(source, /patch\.enrichmentVersion\s*=\s*ENRICHMENT_VERSION/);
});

test("appends to enrichmentSources array", () => {
  assert.match(source, /lead\.enrichmentSources\s*\?\?\s*\[\]/);
  assert.match(source, /\.\.\.sources/);
  assert.match(source, /patch\.enrichmentSources/);
});

// --- Step 10: Status ---

test("sets status to enriched if email found, no_email otherwise", () => {
  assert.match(source, /emailFound\s*\?\s*"enriched"\s*:\s*"no_email"/);
});

test("only updates status for progressable statuses unless forced", () => {
  assert.match(source, /progressableStatuses/);
  assert.match(source, /new_lead/);
  assert.match(source, /no_email/);
  assert.match(source, /progressableStatuses\.has\(lead\.status\)\s*\|\|\s*force/);
});

// --- Step 11: Consent source ---

test("sets consentSource documenting where email was found", () => {
  assert.match(source, /consentSource/);
  assert.match(source, /emailSource/);
  assert.match(source, /website_scraper:/);
  assert.match(source, /hunter:/);
});

// --- Step 12: Log finished ---

test("logs enrichment_finished activity with summary", () => {
  assert.match(source, /enrichment_finished/);
  assert.match(source, /Enrichment completed:/);
  assert.match(source, /sources\.length/);
  assert.match(source, /fieldsUpdated\.length/);
  assert.match(source, /email found/);
});

test("finished activity metadata includes sources, fieldsUpdated, emailFound, status", () => {
  // Match the metadata object in the enrichment_finished call
  assert.match(source, /sources:\s*sources\.map/);
  assert.match(source, /fieldsUpdated/);
  assert.match(source, /emailFound/);
  assert.match(source, /status:\s*newStatus/);
});

// --- Error handling ---

test("catches and continues on Google Places failure", () => {
  const placesBlock = source.slice(
    source.indexOf("// Step 3: Google Places"),
    source.indexOf("// Step 4:"),
  );
  assert.match(placesBlock, /try\s*\{/);
  assert.match(placesBlock, /catch\s*\{/);
});

test("catches and continues on website scraper failure", () => {
  const scraperBlock = source.slice(
    source.indexOf("// Step 4: Website scraper"),
    source.indexOf("// Step 5:"),
  );
  assert.match(scraperBlock, /try\s*\{/);
  assert.match(scraperBlock, /catch\s*\{/);
});

test("catches and continues on Hunter failure", () => {
  const hunterBlock = source.slice(
    source.indexOf("// Step 5: Hunter.io"),
    source.indexOf("// Step 6:"),
  );
  assert.match(hunterBlock, /try\s*\{/);
  assert.match(hunterBlock, /catch\s*\{/);
});

test("catches and continues on Claude analysis failure", () => {
  const claudeBlock = source.slice(
    source.indexOf("// Step 6: Claude analysis"),
    source.indexOf("// Step 7:"),
  );
  assert.match(claudeBlock, /try\s*\{/);
  assert.match(claudeBlock, /catch\s*\{/);
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

test("imports from all enrichment modules", () => {
  assert.match(source, /import.*GooglePlacesResult.*from.*googlePlaces/);
  assert.match(source, /import.*WebsiteScraperResult.*from.*websiteScraper/);
  assert.match(source, /import.*HunterResult.*from.*hunter/);
  assert.match(source, /import.*ClaudeAnalysisResult.*from.*claudeAnalysis/);
  assert.match(source, /import.*discoverSocialLinks.*from.*socialDiscovery/);
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
