import { test, describe } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const freshness = readFileSync(
  "src/components/leads/data-freshness.tsx",
  "utf8",
);
const orchestrator = readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);
const enrichmentLib = readFileSync("src/lib/enrichment.ts", "utf8");

describe("enrichment sources backward compat – legacy sources display correctly", () => {
  // Legacy sources from the pre-sonar pipeline that existing leads may have
  const legacySources = [
    { key: "google_places", label: "Google Places" },
    { key: "website_scraper", label: "Website" },
    { key: "hunter", label: "Hunter.io" },
    { key: "claude_analysis", label: "Claude" },
    { key: "social_discovery", label: "Social Discovery" },
  ];

  for (const { key, label } of legacySources) {
    test(`SOURCE_LABELS maps "${key}" to "${label}"`, () => {
      const pattern = new RegExp(
        `${key}:\\s*"${label.replace(".", "\\.")}"`,
      );
      assert.match(freshness, pattern);
    });
  }

  test("SOURCE_LABELS includes the new sonar_enrichment source", () => {
    assert.match(freshness, /sonar_enrichment:\s*"Sonar Web Search"/);
  });

  test("SOURCE_LABELS includes apify_website source", () => {
    assert.match(freshness, /apify_website:\s*"Website Scraper"/);
  });

  test("SOURCE_LABELS includes apify_social source", () => {
    assert.match(freshness, /apify_social:\s*"Social Pages"/);
  });

  test("unknown sources fall back to raw source string via nullish coalescing", () => {
    // Pattern: SOURCE_LABELS[entry.source] ?? entry.source
    assert.match(
      freshness,
      /SOURCE_LABELS\[entry\.source\]\s*\?\?\s*entry\.source/,
    );
  });
});

describe("enrichment sources backward compat – absent enrichmentSources", () => {
  test("enrichmentSources prop is optional", () => {
    assert.match(freshness, /enrichmentSources\?:/);
  });

  test("sources section is guarded by truthy + length check", () => {
    assert.match(
      freshness,
      /enrichmentSources\s*&&\s*enrichmentSources\.length\s*>\s*0/,
    );
  });
});

describe("enrichment sources backward compat – orchestrator preserves old sources", () => {
  test("new sources are appended to existing enrichmentSources array", () => {
    assert.match(
      orchestrator,
      /patch\.enrichmentSources\s*=\s*\[\s*\.\.\.\(lead\.enrichmentSources\s*\?\?\s*\[\]\)/,
    );
  });

  test("handles leads with no prior enrichmentSources (nullish coalescing to empty array)", () => {
    assert.match(orchestrator, /lead\.enrichmentSources\s*\?\?\s*\[\]/);
  });

  test("Apify social step is guarded by useApify flag (won't run for old-pipeline re-enrichments if disabled)", () => {
    assert.match(
      orchestrator,
      /args\.useApify\s*!==\s*false/,
    );
  });

  test("Apify sources push to the same sources array that gets appended to old entries", () => {
    // apify_social and apify_website both push to the same `sources` array
    assert.match(orchestrator, /sources\.push\(\{\s*source:\s*"apify_social"/);
    assert.match(orchestrator, /source:\s*"apify_website"/);
  });
});

describe("enrichment sources backward compat – latestBySource deduplication", () => {
  test("latestBySource is exported from enrichment lib", () => {
    assert.match(
      enrichmentLib,
      /export\s+function\s+latestBySource/,
    );
  });

  test("latestBySource keeps latest entry per source key", () => {
    assert.match(
      enrichmentLib,
      /entry\.fetchedAt\s*>\s*existing\.fetchedAt/,
    );
  });

  test("data-freshness uses latestBySource to deduplicate before rendering", () => {
    assert.match(freshness, /latestBySource\(enrichmentSources\)\.map/);
  });
});
