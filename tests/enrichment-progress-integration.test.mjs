import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "src/components/leads/bulk-actions.tsx",
  "utf8",
);

// --- EnrichmentProgress integration ---

test("bulk actions imports EnrichmentProgress component", () => {
  assert.match(source, /import.*EnrichmentProgress.*from.*enrichment-progress/);
});

test("tracks enrichingLeadIds state", () => {
  assert.match(source, /const\s*\[enrichingLeadIds,\s*setEnrichingLeadIds\]/);
});

test("captures selected lead IDs when enrichment starts", () => {
  assert.match(source, /setEnrichingLeadIds\(\[\.\.\.selectedLeadIds\]\)/);
});

test("stores enrichment start timestamp in ref", () => {
  assert.match(source, /enrichmentSinceRef/);
  assert.match(source, /useRef/);
  assert.match(source, /enrichmentSinceRef\.current\s*=\s*Date\.now\(\)/);
});

test("clears enriching lead IDs when enrichment finishes", () => {
  assert.match(source, /setEnrichingLeadIds\(\[\]\)/);
});

test("renders EnrichmentProgress when enriching", () => {
  assert.match(source, /<EnrichmentProgress/);
  assert.match(source, /leadIds=\{enrichingLeadIds\}/);
  assert.match(source, /since=\{enrichmentSinceRef\.current\}/);
});

test("conditionally renders progress only during enrichment", () => {
  assert.match(source, /isEnriching\s*&&\s*enrichingLeadIds\.length\s*>\s*0/);
});
