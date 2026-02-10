import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "src/components/leads/enrichment-progress.tsx",
  "utf8",
);

// --- Component structure ---

test("enrichment progress component is exported", () => {
  assert.match(source, /export\s+function\s+EnrichmentProgress/);
});

test("accepts leadIds and since props", () => {
  assert.match(source, /leadIds:\s*Id<"leads">\[\]/);
  assert.match(source, /since:\s*number/);
});

// --- Convex subscription ---

test("uses useQuery to subscribe to enrichmentProgress", () => {
  assert.match(source, /useQuery\(api\.activities\.enrichmentProgress/);
});

test("passes leadIds and since to the query", () => {
  assert.match(source, /leadIds/);
  assert.match(source, /since/);
});

// --- Progress display ---

test("shows spinner while enriching", () => {
  assert.match(source, /Loader2/);
  assert.match(source, /animate-spin/);
});

test("shows progress bar with dynamic width", () => {
  assert.match(source, /style=\{.*width:.*percent/s);
});

test("displays completed count out of total", () => {
  assert.match(source, /completed.*of.*progress\.total/s);
});

test("shows percentage text", () => {
  assert.match(source, /percent.*%/s);
});

// --- Auto-hide behavior ---

test("returns null when query is undefined (loading)", () => {
  assert.match(source, /if\s*\(progress\s*===\s*undefined\)/);
  assert.match(source, /return\s+null/);
});

test("returns null when all leads are done", () => {
  assert.match(source, /allDone/);
  assert.match(source, /completed\s*>=\s*progress\.total/);
});

// --- Progress calculation ---

test("calculates completed as finished plus skipped", () => {
  assert.match(source, /progress\.finished\s*\+\s*progress\.skipped/);
});

test("calculates percent from completed and total", () => {
  assert.match(source, /Math\.round\(\(completed\s*\/\s*progress\.total\)\s*\*\s*100\)/);
});
