import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "src/components/leads/data-freshness.tsx",
  "utf8",
);

const libSource = fs.readFileSync("src/lib/enrichment.ts", "utf8");

// --- Component structure ---

test("data freshness component is exported", () => {
  assert.match(source, /export\s+function\s+DataFreshness/);
});

test("accepts leadId, enrichedAt, and enrichmentSources props", () => {
  assert.match(source, /leadId:\s*Id<"leads">/);
  assert.match(source, /enrichedAt\?:\s*number/);
  assert.match(source, /enrichmentSources\?/);
});

// --- Last enriched display ---

test("shows last enriched date when enrichedAt exists", () => {
  assert.match(source, /Last enriched/);
  assert.match(source, /Intl\.DateTimeFormat/);
});

test("shows 'Never enriched' when no enrichedAt", () => {
  assert.match(source, /Never enriched/);
});

// --- Staleness indicator ---

test("defines fresh threshold at 30 days", () => {
  assert.match(libSource, /daysSince\s*<\s*30/);
  assert.match(libSource, /return\s+["']fresh["']/);
});

test("defines aging threshold at 30-90 days", () => {
  assert.match(libSource, /daysSince\s*<=\s*90/);
  assert.match(libSource, /return\s+["']aging["']/);
});

test("defines stale threshold over 90 days", () => {
  assert.match(libSource, /return\s+["']stale["']/);
});

test("uses colored badges for staleness levels", () => {
  assert.match(libSource, /bg-green-100.*text-green-800/);
  assert.match(libSource, /bg-amber-100.*text-amber-800/);
  assert.match(libSource, /bg-red-100.*text-red-800/);
});

test("renders Badge component with staleness", () => {
  assert.match(source, /<Badge/);
  assert.match(source, /STALENESS_CONFIG/);
});

// --- Enrichment sources ---

test("displays enrichment source labels", () => {
  assert.match(source, /Enrichment sources/);
  assert.match(source, /Google Places/);
  assert.match(source, /Hunter\.io/);
  assert.match(source, /Claude/);
  assert.match(source, /Website/);
  assert.match(source, /Sonar Web Search/);
});

test("imports latestBySource from shared enrichment lib", () => {
  assert.match(source, /import.*latestBySource.*from.*enrichment/);
  assert.match(libSource, /export\s+function\s+latestBySource/);
});

// --- Source badges ---

test("renders each source as an outline Badge with fetch date", () => {
  assert.match(source, /variant="outline"/);
  assert.match(source, /entry\.fetchedAt/);
  assert.match(source, /entry\.source/);
});

test("latestBySource keeps only latest entry per source", () => {
  assert.match(libSource, /entry\.fetchedAt\s*>\s*existing\.fetchedAt/);
});

test("formats source fetch date with Intl.DateTimeFormat", () => {
  // The source badges format dates the same way as Last enriched
  assert.match(source, /new Intl\.DateTimeFormat.*format\(new Date\(entry\.fetchedAt\)\)/s);
});

// --- Enrich / Re-enrich button ---

test("renders enrich button", () => {
  assert.match(source, /Enrich/);
  assert.match(source, /<Button/);
});

test("shows 'Enrich' for never-enriched leads and 'Re-enrich' for previously enriched leads", () => {
  assert.match(source, /hasBeenEnriched/);
  assert.match(source, /Re-enrich/);
  assert.match(source, /"Enrich"/);
});

test("passes overwrite (not force) when re-enriching previously enriched leads", () => {
  assert.match(source, /overwrite:\s*hasBeenEnriched\s*\?\s*true\s*:\s*undefined/);
});

test("uses batchEnrichPublic action", () => {
  assert.match(source, /api\.enrichment\.batchEnrichPublic\.batchEnrich/);
});

test("disables button while enriching", () => {
  assert.match(source, /disabled=\{isEnriching\}/);
});

test("shows spinner icon while enriching", () => {
  assert.match(source, /animate-spin/);
});

test("shows enrichment progress indicator during enrichment", () => {
  assert.match(source, /<EnrichmentProgress/);
  assert.match(source, /isEnriching/);
});

// --- Toast notifications ---

test("shows appropriate toast for first enrichment vs re-enrichment", () => {
  assert.match(source, /toast\.info.*Enriching lead/);
  assert.match(source, /Re-enriching lead/);
});

test("shows toast on success or failure", () => {
  assert.match(source, /toast\.success.*complete/i);
  assert.match(source, /toast\.error.*failed/i);
});
