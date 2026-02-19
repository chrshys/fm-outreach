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
  assert.match(block, /clusterId:\s*v\.optional\(/);
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

  // Required CSV fields
  const csvFields = [
    "name",
    "type",
    "farmDescription",
    "contactPhone",
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
  ];

  for (const field of csvFields) {
    assert.match(block, new RegExp(`${field}:\\s*lead\\.${field}`), `should project field: ${field}`);
  }

  // Should NOT include internal/non-CSV fields in the map output
  const mapBlock = block.match(/\.map\(\(lead\)\s*=>\s*\(\{[\s\S]*?\}\)\)/);
  assert.ok(mapBlock, ".map() projection should exist");
  const projection = mapBlock[0];

  assert.doesNotMatch(projection, /_id:/);
  assert.doesNotMatch(projection, /status:/);
  assert.doesNotMatch(projection, /contactEmail:/);
  assert.doesNotMatch(projection, /clusterId:/);
  assert.doesNotMatch(projection, /updatedAt:/);
});
