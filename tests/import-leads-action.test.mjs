import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/seeds/importLeads.ts", "utf8");

test("importLeads action accepts csvContent and filename args", () => {
  assert.match(source, /export\s+const\s+importLeads\s*=\s*action\(/);
  assert.match(source, /csvContent:\s*v\.string\(\)/);
  assert.match(source, /filename:\s*v\.string\(\)/);
});

test("importLeads action uses csv parser and writes through internal mutation", () => {
  assert.match(source, /parseCsv\(args\.csvContent\)/);
  assert.match(source, /ctx\.runMutation\(/);
  assert.match(source, /insertImportedLeads/);
  assert.match(source, /\{\s*leads\s*\}/);
});

test("insertImportedLeads deduplicates by normalized name and city", () => {
  assert.match(source, /normalizeDedupValue\(value:\s*string\):\s*string/);
  assert.match(source, /trim\(\)\.toLocaleLowerCase\(\)/);
  assert.match(source, /normalizeDedupName\(value:\s*string\):\s*string/);
  assert.match(source, /replace\(\/\\bfarmers\['’\]\/g,\s*"farmers"\)/);
  assert.match(source, /replace\(\/\\bst\\\.\?\\b\/g,\s*"street"\)/);
  assert.match(source, /dedupKeyForLead\(lead:\s*\{\s*name:\s*string;\s*city:\s*string\s*\}\)/);
  assert.match(source, /query\("leads"\)\.collect\(\)/);
  assert.match(source, /if\s*\(seenLeadKeys\.has\(dedupKey\)\)\s*\{/);
});

test("insertImportedLeads tracks inserted, skipped, and errored counts", () => {
  assert.match(source, /let\s+inserted\s*=\s*0/);
  assert.match(source, /let\s+skipped\s*=\s*0/);
  assert.match(source, /let\s+errored\s*=\s*0/);
  assert.match(source, /skipped\s*\+=\s*1/);
  assert.match(source, /inserted\s*\+=\s*1/);
  assert.match(source, /errored\s*\+=\s*1/);
  assert.match(source, /return\s*\{\s*inserted,\s*skipped,\s*errored\s*\}/);
});
