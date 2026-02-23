import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/leads.ts", "utf8");

test("listForExport query is exported from convex/leads.ts", () => {
  assert.match(source, /export\s+const\s+listForExport\s*=\s*query\(/);
});

test("listForExport imports matchesFilters from lib/leadsList", () => {
  assert.match(source, /import\s+\{[^}]*matchesFilters[^}]*\}\s+from\s+["']\.\/lib\/leadsList["']/);
});

test("listForExport accepts the same filter args as list (all optional, no cursor/sort)", () => {
  // Extract the listForExport block
  const exportMatch = source.match(
    /export\s+const\s+listForExport\s*=\s*query\(\{[\s\S]*?\n\}\);/,
  );
  assert.ok(exportMatch, "listForExport query block should exist");
  const block = exportMatch[0];

  // All filter args should be present and optional
  assert.match(block, /status:\s*v\.optional\(/);
  assert.match(block, /type:\s*v\.optional\(/);
  assert.match(block, /clusterIds:\s*v\.optional\(/);
  assert.match(block, /hasEmail:\s*v\.optional\(/);
  assert.match(block, /hasSocial:\s*v\.optional\(/);
  assert.match(block, /hasFacebook:\s*v\.optional\(/);
  assert.match(block, /hasInstagram:\s*v\.optional\(/);
  assert.match(block, /source:\s*v\.optional\(/);
  assert.match(block, /needsFollowUp:\s*v\.optional\(/);

  // Should NOT have cursor or sort args
  assert.doesNotMatch(block, /cursor:/);
  assert.doesNotMatch(block, /sortBy:/);
  assert.doesNotMatch(block, /sortOrder:/);
});

test("listForExport uses matchesFilters to filter leads", () => {
  const exportMatch = source.match(
    /export\s+const\s+listForExport\s*=\s*query\(\{[\s\S]*?\n\}\);/,
  );
  const block = exportMatch[0];

  assert.match(block, /matchesFilters\(/);
});

test("listForExport fetches all leads via ctx.db.query and .collect()", () => {
  const exportMatch = source.match(
    /export\s+const\s+listForExport\s*=\s*query\(\{[\s\S]*?\n\}\);/,
  );
  const block = exportMatch[0];

  assert.match(block, /ctx\.db\.query\(["']leads["']\)\.collect\(\)/);
});

test("listForExport maps output to CSV fields only", () => {
  const exportMatch = source.match(
    /export\s+const\s+listForExport\s*=\s*query\(\{[\s\S]*?\n\}\);/,
  );
  const block = exportMatch[0];

  // Required CSV fields (direct lead.field projections)
  const csvFields = [
    "name",
    "type",
    "address",
    "city",
    "region",
    "province",
    "postalCode",
    "countryCode",
    "latitude",
    "longitude",
    "placeId",
    "website",
    "socialLinks",
    "products",
    "locationDescription",
    "imagePrompt",
  ];

  for (const field of csvFields) {
    assert.match(block, new RegExp(`${field}:\\s*lead\\.${field}`), `should project field: ${field}`);
  }

  // Should NOT include internal/non-CSV fields in the map output
  const mapBlock = block.match(/\.map\(\(lead\)\s*=>\s*[\s\S]*?\}\)/);
  assert.ok(mapBlock, ".map() projection should exist");
  const projection = mapBlock[0];

  assert.match(projection, /_id:\s*lead\._id/, "should include _id for bulk stamp after export");
  assert.doesNotMatch(projection, /status:/);
  assert.doesNotMatch(projection, /contactEmail:/);
  assert.doesNotMatch(projection, /clusterId:/);
  assert.doesNotMatch(projection, /updatedAt:/);

  // Removed fields should not be in the projection
  assert.doesNotMatch(projection, /farmDescription:/, "farmDescription should be removed from export");
  assert.doesNotMatch(projection, /contactPhone:/, "contactPhone should be removed from export");
});

test("listForExport derives categories from enrichmentData.structuredProducts", () => {
  const exportMatch = source.match(
    /export\s+const\s+listForExport\s*=\s*query\(\{[\s\S]*?\n\}\);/,
  );
  const block = exportMatch[0];

  // Should reference enrichmentData and structuredProducts
  assert.match(block, /enrichmentData/, "should reference enrichmentData for categories");
  assert.match(block, /structuredProducts/, "should reference structuredProducts for categories");
  // Should extract unique categories via Set
  assert.match(block, /new Set\(/, "should use Set to deduplicate categories");
  // Should map to p.category
  assert.match(block, /\.category/, "should extract category from each product");
  // Should filter out undefined values
  assert.match(block, /\.filter\(/, "should filter out undefined categories");
});

test("listForExport imports normalizeCategoryKey from enrichment/categories", () => {
  assert.match(
    source,
    /import\s+\{[^}]*normalizeCategoryKey[^}]*\}\s+from\s+["']\.\/enrichment\/categories["']/,
    "should import normalizeCategoryKey from ./enrichment/categories",
  );
});

test("listForExport applies normalizeCategoryKey when deriving categories", () => {
  const exportMatch = source.match(
    /export\s+const\s+listForExport\s*=\s*query\(\{[\s\S]*?\n\}\);/,
  );
  const block = exportMatch[0];

  assert.match(
    block,
    /normalizeCategoryKey\(/,
    "should call normalizeCategoryKey in the categories derivation",
  );
  assert.match(
    block,
    /normalizeCategoryKey\(p\.category\s*\?\?\s*""\)/,
    "should call normalizeCategoryKey(p.category ?? \"\") for each product",
  );
});
