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

// =============================================================
// The orchestrator handles: cooldown check, unsubscribe block
// list, Google Places, merge logic, status transitions, consent
// source, and activity logging.
// =============================================================

// --- 1. Cooldown check ---

test("orchestrator checks 30-day cooldown before enriching", () => {
  assert.match(source, /COOLDOWN_MS/);
  assert.match(source, /Date\.now\(\)\s*-\s*lead\.enrichedAt\s*<\s*COOLDOWN_MS/);
});

test("cooldown is bypassed with force flag", () => {
  assert.match(source, /!force\s*&&\s*lead\.enrichedAt/);
});

test("cooldown skip returns early without calling external APIs", () => {
  const cooldownBlock = source.slice(
    source.indexOf("// Step 1: Check cooldown"),
    source.indexOf("// Step 2:"),
  );
  assert.match(cooldownBlock, /return\s*\{/);
  assert.match(cooldownBlock, /skipped:\s*true/);
});

// --- 2. Unsubscribe block list ---

test("orchestrator checks unsubscribe block list before enrichment", () => {
  assert.match(source, /api\.smartlead\.unsubscribe\.isUnsubscribed/);
});

test("block list check is Step 0 — before cooldown and API calls", () => {
  const blockListPos = source.indexOf("// Step 0:");
  const cooldownPos = source.indexOf("// Step 1:");
  const placesPos = source.indexOf("// Step 3:");
  assert.ok(blockListPos >= 0);
  assert.ok(blockListPos < cooldownPos);
  assert.ok(blockListPos < placesPos);
});

test("blocked leads are skipped with enrichment_skipped activity", () => {
  const blockListBlock = source.slice(
    source.indexOf("// Step 0:"),
    source.indexOf("// Step 1:"),
  );
  assert.match(blockListBlock, /isBlocked/);
  assert.match(blockListBlock, /enrichment_skipped/);
  assert.match(blockListBlock, /block list/);
  assert.match(blockListBlock, /skipped:\s*true/);
});

// --- 3. Google Places ---

test("orchestrator searches Google Places when lead has no placeId", () => {
  assert.match(source, /!lead\.placeId/);
  assert.match(source, /enrichFromGooglePlaces/);
});

test("orchestrator fetches place details when placeId exists but data is missing", () => {
  assert.match(source, /fetchPlaceDetails/);
  assert.match(source, /!lead\.contactPhone\s*\|\|\s*!lead\.website\s*\|\|\s*overwrite/);
});

test("Google Places provides phone, website, postalCode, countryCode", () => {
  assert.match(source, /patch\.contactPhone\s*=\s*placesResult\.phone/);
  assert.match(source, /patch\.website\s*=\s*placesResult\.website/);
  assert.match(source, /patch\.postalCode\s*=\s*placesResult\.postalCode/);
  assert.match(source, /patch\.countryCode\s*=\s*placesResult\.countryCode/);
});

test("Google Places errors are caught and pipeline continues", () => {
  const placesBlock = source.slice(
    source.indexOf("// Step 3: Google Places"),
    source.indexOf("// Step 4:"),
  );
  assert.match(placesBlock, /try\s*\{/);
  assert.match(placesBlock, /catch\s*\{/);
});

// --- 4. Merge logic ---

test("orchestrator only fills empty fields unless overwrite is true", () => {
  // Check key fields use the (!lead.field || overwrite) pattern
  assert.match(source, /!lead\.contactPhone\s*\|\|\s*overwrite/);
  assert.match(source, /!lead\.website\s*\|\|\s*overwrite/);
  assert.match(source, /!lead\.contactEmail\s*\|\|\s*overwrite/);
  assert.match(source, /!lead\.contactName\s*\|\|\s*overwrite/);
  assert.match(source, /!lead\.farmDescription\s*\|\|\s*overwrite/);
});

test("Google Places phone takes priority over Sonar phone", () => {
  // Sonar phone is only used if patch.contactPhone is not already set
  assert.match(source, /sonarResult\?\.contactPhone\s*&&\s*!patch\.contactPhone/);
});

test("Google Places website takes priority over Sonar website", () => {
  assert.match(source, /sonarResult\?\.website\s*&&\s*!patch\.website/);
});

test("social links are merged preserving existing values", () => {
  assert.match(source, /existingSocial\s*=\s*lead\.socialLinks\s*\?\?\s*\{\}/);
  assert.match(source, /\.\.\.existingSocial/);
  assert.match(source, /\.\.\.newSocial/);
});

test("enrichment sources are appended to existing array", () => {
  assert.match(source, /lead\.enrichmentSources\s*\?\?\s*\[\]/);
  assert.match(source, /\.\.\.sources/);
});

test("all field changes are applied via a single leads.update call", () => {
  assert.match(source, /ctx\.runMutation\(api\.leads\.update/);
  assert.match(source, /\.\.\.patch/);
});

// --- 5. Status transitions ---

test("status is enriched when email found, no_email otherwise", () => {
  assert.match(source, /const\s+emailFound\s*=\s*!!\(patch\.contactEmail\s*\|\|\s*lead\.contactEmail\)/);
  assert.match(source, /emailFound\s*\?\s*"enriched"\s*:\s*"no_email"/);
});

test("status only transitions from new_lead or no_email (no regressions)", () => {
  assert.match(source, /progressableStatuses\s*=\s*new\s+Set\(\["new_lead",\s*"no_email"\]\)/);
  assert.match(source, /progressableStatuses\.has\(lead\.status\)\s*\|\|\s*overwrite/);
});

// --- 6. Consent source ---

test("consentSource is set when email is discovered via Sonar", () => {
  assert.match(source, /emailSource\s*=\s*`sonar - /);
  assert.match(source, /patch\.consentSource\s*=\s*emailSource/);
});

test("consentSource is not overwritten unless forced", () => {
  assert.match(source, /!lead\.consentSource\s*\|\|\s*overwrite/);
});

test("consentSource is only set when emailSource is non-null", () => {
  assert.match(source, /if\s*\(emailSource\s*&&/);
});

// --- 7. Activity logging ---

test("orchestrator logs enrichment_started before API calls", () => {
  const startedPos = source.indexOf("enrichment_started");
  const placesPos = source.indexOf("// Step 3:");
  assert.ok(startedPos >= 0, "should log enrichment_started");
  assert.ok(startedPos < placesPos, "started log must come before API calls");
});

test("orchestrator logs enrichment_finished with summary metadata", () => {
  assert.match(source, /enrichment_finished/);
  assert.match(source, /Enrichment completed:/);
  assert.match(source, /sources:\s*sources\.map/);
  assert.match(source, /fieldsUpdated/);
  assert.match(source, /emailFound/);
  assert.match(source, /status:\s*newStatus/);
});

test("orchestrator logs enrichment_skipped for cooldown and block list", () => {
  // Count occurrences of enrichment_skipped — should be at least 2 (block list + cooldown)
  const matches = source.match(/enrichment_skipped/g);
  assert.ok(matches && matches.length >= 2, "should have at least 2 enrichment_skipped logs");
});

test("activity logging uses orchestratorHelpers.logActivity", () => {
  assert.match(source, /internal\.enrichment\.orchestratorHelpers\.logActivity/);
});

test("logActivity inserts into activities table with lead reference", () => {
  assert.match(helpersSource, /ctx\.db\.insert\("activities"/);
  assert.match(helpersSource, /leadId:\s*args\.leadId/);
});

test("logActivity updates lead updatedAt timestamp", () => {
  assert.match(helpersSource, /ctx\.db\.patch\(args\.leadId/);
  assert.match(helpersSource, /updatedAt:\s*now/);
});
