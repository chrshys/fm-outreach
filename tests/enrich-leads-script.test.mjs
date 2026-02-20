import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("scripts/enrich-leads.ts", "utf8");

test("enrich-leads script includes tsx run instructions", () => {
  assert.match(source, /Run with:\s*npx tsx scripts\/enrich-leads\.ts/);
});

test("script reads filter from command line arguments", () => {
  assert.match(source, /process\.argv\[2\]/);
});

test("script shows usage instructions when filter is missing", () => {
  assert.match(source, /Usage:/);
  assert.match(source, /enrich-leads\.ts/);
});

test("script supports --force flag", () => {
  assert.match(source, /process\.argv\.includes\("--force"\)/);
});

test("script uses convex url from environment with validation", () => {
  assert.match(source, /process\.env\.CONVEX_URL\s*\?\?\s*process\.env\.NEXT_PUBLIC_CONVEX_URL/);
  assert.match(
    source,
    /Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable/,
  );
});

// --- Filter parsing ---

test("script parses status: prefix filters", () => {
  assert.match(source, /input\.startsWith\("status:"\)/);
  assert.match(source, /input\.slice\("status:"\.length\)/);
});

test("script validates status values against known set", () => {
  assert.match(source, /VALID_STATUSES/);
  assert.match(source, /new_lead/);
  assert.match(source, /no_email/);
  assert.match(source, /enriched/);
});

test("script parses name: prefix filters", () => {
  assert.match(source, /input\.startsWith\("name:"\)/);
  assert.match(source, /input\.slice\("name:"\.length\)/);
});

test("script validates name: filter is not empty", () => {
  assert.match(source, /name: filter requires a lead name/);
});

test("script treats non-prefixed input as cluster name", () => {
  assert.match(source, /type:\s*"cluster"/);
  assert.match(source, /name:\s*input/);
});

// --- Cluster resolution ---

test("script queries clusters list to resolve cluster name", () => {
  assert.match(source, /api\.clusters\.list/);
});

test("script matches cluster name case-insensitively", () => {
  assert.match(source, /\.toLowerCase\(\)/);
});

test("script shows available clusters on mismatch", () => {
  assert.match(source, /not found\. Available clusters/);
});

// --- Lead fetching ---

test("script queries leads to get matching lead IDs", () => {
  assert.match(source, /api\.leads\.listAllSummary/);
});

test("script filters leads by clusterId for cluster filter", () => {
  assert.match(source, /l\.clusterId\s*===\s*match\._id/);
});

test("script filters leads by status for status filter", () => {
  assert.match(source, /l\.status\s*===\s*filter\.status/);
});

test("script filters leads by name for name filter", () => {
  assert.match(source, /l\.name\.toLowerCase\(\)\s*===\s*filter\.name\.toLowerCase\(\)/);
});

// --- Batch enrichment ---

test("script calls batchEnrich action with lead IDs", () => {
  assert.match(source, /api\.enrichment\.batchEnrichPublic\.batchEnrich/);
  assert.match(source, /convex\.action\(enrichRef/);
});

test("script chunks leads into batches of 25", () => {
  assert.match(source, /BATCH_SIZE\s*=\s*25/);
  assert.match(source, /leads\.slice\(i,\s*i\s*\+\s*BATCH_SIZE\)/);
});

test("script passes force flag to batchEnrich", () => {
  assert.match(source, /force/);
});

// --- Results reporting ---

test("script prints leads enriched count", () => {
  assert.match(source, /Leads enriched/);
  assert.match(source, /totalSucceeded/);
});

test("script prints emails found count", () => {
  assert.match(source, /Emails found/);
  assert.match(source, /totalEmailsFound/);
});

test("script prints no-email count", () => {
  assert.match(source, /No email/);
  assert.match(source, /totalNoEmail/);
});

test("script prints skipped count", () => {
  assert.match(source, /Skipped/);
  assert.match(source, /totalSkipped/);
});

test("script prints errors count and details", () => {
  assert.match(source, /Errors/);
  assert.match(source, /errors\.length\s*>\s*0/);
});

test("script tracks emailFound from enrichment summary", () => {
  assert.match(source, /r\.summary\.emailFound/);
});

test("script handles main promise rejection", () => {
  assert.match(source, /main\(\)\.catch/);
  assert.match(source, /Lead enrichment failed/);
});

// --- Per-lead detail output ---

test("script resolves lead name from batch for each result", () => {
  assert.match(source, /batch\.find\(\(l\)\s*=>\s*l\._id\s*===\s*r\.leadId\)/);
});

test("script prints [done] tag with lead name for successful enrichments", () => {
  assert.match(source, /\[done\]/);
  assert.match(source, /leadName/);
});

test("script prints [skip] tag for skipped leads", () => {
  assert.match(source, /\[skip\]/);
});

test("script prints [fail] tag for errored leads", () => {
  assert.match(source, /\[fail\]/);
});

test("script prints sources used per lead", () => {
  assert.match(source, /r\.summary\.sources\.join/);
  assert.match(source, /sources:/);
});

test("script prints fields updated per lead", () => {
  assert.match(source, /r\.summary\.fieldsUpdated\.join/);
  assert.match(source, /updated:/);
});

test("script shows email found tag when email was discovered", () => {
  assert.match(source, /r\.summary\.emailFound\s*\?\s*".*email found.*"/);
});
