import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("scripts/discover-leads.ts", "utf8");

test("discover-leads script includes tsx run instructions", () => {
  assert.match(source, /Run with:\s*npx tsx scripts\/discover-leads\.ts/);
});

test("script reads region from command line arguments", () => {
  assert.match(source, /process\.argv\[2\]/);
});

test("script supports optional province argument", () => {
  assert.match(source, /process\.argv\[3\]/);
});

test("script shows usage instructions when region is missing", () => {
  assert.match(source, /Usage:/);
  assert.match(source, /discover-leads\.ts\s*<region>/);
});

test("script calls discoverLeads action with region and province", () => {
  assert.match(source, /api\.discovery\.discoverLeads\.discoverLeads/);
  assert.match(source, /convex\.action\(discoverRef/);
  assert.match(source, /region/);
});

test("script uses convex url from environment with validation", () => {
  assert.match(source, /process\.env\.CONVEX_URL\s*\?\?\s*process\.env\.NEXT_PUBLIC_CONVEX_URL/);
  assert.match(
    source,
    /Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable/,
  );
});

test("script prints results summary with new leads, duplicates, and total", () => {
  assert.match(source, /result\.newLeads/);
  assert.match(source, /result\.duplicatesSkipped/);
  assert.match(source, /result\.totalInDatabase/);
});
