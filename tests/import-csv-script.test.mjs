import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("scripts/import-csv.ts", "utf8");

test("import-csv script includes tsx run instructions", () => {
  assert.match(source, /Run with:\s*npx tsx scripts\/import-csv\.ts/);
});

test("import-csv script reads csv file path from argv", () => {
  assert.match(source, /process\.argv\[2\]/);
});

test("import-csv script resolves the csv path to an absolute path", () => {
  assert.match(source, /path\.resolve\(process\.cwd\(\),\s*csvPath\)/);
});

test("import-csv script reads the csv file from disk", () => {
  assert.match(source, /readFile\(resolvedPath,\s*"utf8"\)/);
});

test("import-csv script calls importLeads action with csvContent and filename", () => {
  assert.match(source, /convex\.action\(api\.seeds\.importLeads\.importLeads,\s*\{/);
  assert.match(source, /csvContent/);
  assert.match(source, /filename/);
});

test("import-csv script prints inserted count", () => {
  assert.match(source, /Inserted:.*result\.inserted/);
});

test("import-csv script prints duplicated count", () => {
  assert.match(source, /Duplicated:.*result\.skipped/);
});

test("import-csv script prints errored count", () => {
  assert.match(source, /Errored:.*result\.errored/);
});

test("import-csv script shows usage when no csv path provided", () => {
  assert.match(source, /Usage:\s*npx tsx scripts\/import-csv\.ts/);
  assert.match(source, /process\.exitCode\s*=\s*1/);
});

test("import-csv script uses convex url from environment with validation", () => {
  assert.match(source, /process\.env\.CONVEX_URL\s*\?\?\s*process\.env\.NEXT_PUBLIC_CONVEX_URL/);
  assert.match(
    source,
    /Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable/,
  );
});
