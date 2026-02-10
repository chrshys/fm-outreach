import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "src/app/leads/[id]/page.tsx",
  "utf8",
);

// --- Data Freshness integration on lead detail page ---

test("imports DataFreshness component", () => {
  assert.match(source, /import\s+\{.*DataFreshness.*\}\s+from/);
});

test("renders DataFreshness component with lead props", () => {
  assert.match(source, /<DataFreshness/);
  assert.match(source, /leadId=\{leadId\}/);
  assert.match(source, /enrichedAt=\{lead\.enrichedAt\}/);
  assert.match(source, /enrichmentSources=\{lead\.enrichmentSources\}/);
});

test("wraps DataFreshness in a Card", () => {
  assert.match(source, /Data Freshness/);
  assert.match(source, /Enrichment status and data age/);
});
