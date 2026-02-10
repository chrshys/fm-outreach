import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("scripts/seed.ts", "utf8");

test("seed script includes tsx run instructions", () => {
  assert.match(source, /Run with:\s*npx tsx scripts\/seed\.ts/);
});

test("seed script reads both csv files from data directory", () => {
  assert.match(source, /readCsv\("farms\.csv"\)/);
  assert.match(source, /readCsv\("farmers-markets\.csv"\)/);
});

test("seed script calls runSeed action with csv content and filenames", () => {
  assert.match(source, /convex\.action\(api\.seeds\.runSeed\.runSeed,\s*\{/);
  assert.match(source, /farmsCsvContent/);
  assert.match(source, /marketsCsvContent/);
  assert.match(source, /farmsFilename:\s*"farms\.csv"/);
  assert.match(source, /marketsFilename:\s*"farmers-markets\.csv"/);
});

test("seed script triggers geocode action after seeding", () => {
  assert.match(source, /convex\.action\(api\.seeds\.geocodeLeads\.geocodeLeads,\s*\{\s*\}\)/);
});

test("seed script uses convex url from environment with validation", () => {
  assert.match(source, /process\.env\.CONVEX_URL\s*\?\?\s*process\.env\.NEXT_PUBLIC_CONVEX_URL/);
  assert.match(
    source,
    /Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable/,
  );
});
