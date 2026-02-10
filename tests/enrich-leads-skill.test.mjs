import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(".claude/skills/enrich-leads.md", "utf8");

test("skill file exists and has correct title", () => {
  assert.match(source, /# \/enrich-leads/);
});

test("skill documents the CLI command", () => {
  assert.match(source, /npx tsx scripts\/enrich-leads\.ts/);
});

test("skill describes the enrichment pipeline sources", () => {
  assert.match(source, /Google Places/);
  assert.match(source, /website scraper/i);
  assert.match(source, /Hunter\.io/);
  assert.match(source, /Claude analysis/);
  assert.match(source, /social discovery/i);
});

test("skill documents cluster name filter", () => {
  assert.match(source, /Niagara/);
  assert.match(source, /Prince Edward County/);
});

test("skill documents status filter syntax", () => {
  assert.match(source, /status:new_lead/);
  assert.match(source, /status:no_email/);
});

test("skill documents the --force flag", () => {
  assert.match(source, /--force/);
  assert.match(source, /cooldown/);
});

test("skill documents the results format", () => {
  assert.match(source, /Leads enriched/);
  assert.match(source, /Emails found/);
  assert.match(source, /No.email/i);
  assert.match(source, /Errors/);
});

test("skill documents required environment variables", () => {
  assert.match(source, /CONVEX_URL/);
});

test("skill includes usage examples", () => {
  assert.match(source, /enrich leads in Niagara/);
  assert.match(source, /enrich all new leads/);
  assert.match(source, /re-enrich leads with no email/);
});

test("skill references the Convex action locations", () => {
  assert.match(source, /convex\/enrichment\/batchEnrichPublic\.ts/);
  assert.match(source, /convex\/enrichment\/orchestrator\.ts/);
});
