import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(".claude/skills/discover-leads.md", "utf8");

test("skill file exists and has correct title", () => {
  assert.match(source, /# \/discover-leads/);
});

test("skill documents the CLI command", () => {
  assert.match(source, /npx tsx scripts\/discover-leads\.ts/);
});

test("skill describes Google Places search for farms", () => {
  assert.match(source, /Google Places/);
  assert.match(source, /farms/);
});

test("skill documents the results format", () => {
  assert.match(source, /New leads found/);
  assert.match(source, /Duplicates skipped/);
  assert.match(source, /Total leads in database/i);
});

test("skill documents required environment variables", () => {
  assert.match(source, /CONVEX_URL/);
  assert.match(source, /GOOGLE_PLACES_API_KEY/);
});

test("skill includes usage examples with region names", () => {
  assert.match(source, /Niagara/);
  assert.match(source, /Prince Edward County/);
});

test("skill references the Convex action location", () => {
  assert.match(source, /convex\/discovery\/discoverLeads\.ts/);
});
