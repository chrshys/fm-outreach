import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/activities.ts", "utf8");

// --- Query export ---

test("enrichmentProgress query is exported", () => {
  assert.match(source, /export\s+const\s+enrichmentProgress\s*=\s*query\(/);
});

// --- Args ---

test("accepts leadIds as array of lead IDs", () => {
  assert.match(source, /leadIds:\s*v\.array\(v\.id\("leads"\)\)/);
});

test("accepts since as a number timestamp", () => {
  assert.match(source, /since:\s*v\.number\(\)/);
});

// --- Return shape ---

test("returns started, finished, skipped, and total counts", () => {
  assert.match(source, /return\s*\{\s*started.*finished.*skipped.*total/s);
});

test("returns zeros for empty leadIds", () => {
  assert.match(source, /started:\s*0,\s*finished:\s*0,\s*skipped:\s*0,\s*total:\s*0/);
});

// --- Filtering ---

test("filters activities by since timestamp", () => {
  assert.match(source, /activity\.createdAt\s*<\s*args\.since/);
});

test("queries activities by leadId index", () => {
  assert.match(source, /withIndex\("by_leadId".*eq\("leadId",\s*leadId\)/s);
});

// --- Activity type counting ---

test("counts enrichment_started activities", () => {
  assert.match(source, /activity\.type\s*===\s*"enrichment_started"\)\s*started\+\+/);
});

test("counts enrichment_finished activities", () => {
  assert.match(source, /activity\.type\s*===\s*"enrichment_finished"\)\s*finished\+\+/);
});

test("counts enrichment_skipped activities", () => {
  assert.match(source, /activity\.type\s*===\s*"enrichment_skipped"\)\s*skipped\+\+/);
});
