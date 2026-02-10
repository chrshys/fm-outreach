import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const orchestratorSource = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);

const batchSource = fs.readFileSync(
  "convex/enrichment/batchEnrich.ts",
  "utf8",
);

const publicSource = fs.readFileSync(
  "convex/enrichment/batchEnrichPublic.ts",
  "utf8",
);

const dataFreshnessSource = fs.readFileSync(
  "src/components/leads/data-freshness.tsx",
  "utf8",
);

// =============================================================
// The "Re-enrich" button must respect the 30-day cooldown.
// Previously it passed force:true which bypassed the cooldown.
// Now it passes overwrite:true (field refresh) without force
// (cooldown bypass).
// =============================================================

// --- Separation of concerns: force vs overwrite ---

test("orchestrator accepts both force and overwrite args", () => {
  assert.match(orchestratorSource, /force:\s*v\.optional\(v\.boolean\(\)\)/);
  assert.match(orchestratorSource, /overwrite:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("overwrite defaults to force when not explicitly provided", () => {
  assert.match(
    orchestratorSource,
    /const\s+overwrite\s*=\s*args\.overwrite\s*\?\?\s*force/,
  );
});

test("cooldown check uses force (not overwrite)", () => {
  const cooldownBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 1: Check cooldown"),
    orchestratorSource.indexOf("// Step 2:"),
  );
  assert.match(cooldownBlock, /!force\s*&&/);
  assert.doesNotMatch(cooldownBlock, /!overwrite/);
});

test("field merge logic uses overwrite (not force)", () => {
  // All field conditionals after Step 8 should use overwrite, not force
  const mergeBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 8: Merge results"),
    orchestratorSource.indexOf("// Step 9:"),
  );

  // overwrite should appear in merge conditions
  assert.match(mergeBlock, /overwrite/);
  // force should NOT appear in merge conditions
  assert.doesNotMatch(mergeBlock, /\bforce\b/);
});

test("status progression guard uses overwrite (not force)", () => {
  const statusBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 10: Set status"),
    orchestratorSource.indexOf("// Step 11:"),
  );

  assert.match(statusBlock, /overwrite/);
  assert.doesNotMatch(statusBlock, /\bforce\b/);
});

// --- Re-enrich button behavior ---

test("Re-enrich button passes overwrite:true, not force:true", () => {
  const fnStart = dataFreshnessSource.indexOf("async function handleEnrich");
  const fnEnd = dataFreshnessSource.indexOf("}", dataFreshnessSource.indexOf("} finally", fnStart));
  const fnBody = dataFreshnessSource.slice(fnStart, fnEnd);

  assert.match(fnBody, /overwrite:\s*hasBeenEnriched\s*\?\s*true\s*:\s*undefined/);
  assert.doesNotMatch(fnBody, /force:/);
});

test("Re-enrich button call will be subject to 30-day cooldown", () => {
  // Since it doesn't pass force:true, the cooldown check (!force && ...) will apply
  const fnStart = dataFreshnessSource.indexOf("async function handleEnrich");
  const fnBody = dataFreshnessSource.slice(fnStart, fnStart + 500);

  // No force parameter means force defaults to false in orchestrator
  assert.doesNotMatch(fnBody, /force:\s*true/);
  assert.doesNotMatch(fnBody, /force:\s*hasBeenEnriched/);
});

// --- Batch/public API passes overwrite through ---

test("batchEnrichPublic accepts overwrite arg", () => {
  assert.match(publicSource, /overwrite:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("batchEnrichPublic passes overwrite to internal action", () => {
  assert.match(publicSource, /overwrite:\s*args\.overwrite/);
});

test("batchEnrichLeads accepts overwrite arg", () => {
  assert.match(batchSource, /overwrite:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("batchEnrichLeads passes overwrite to enrichLead", () => {
  assert.match(batchSource, /overwrite/);
  // The call to enrichLead should include overwrite
  const callBlock = batchSource.slice(
    batchSource.indexOf("internal.enrichment.orchestrator.enrichLead"),
    batchSource.indexOf("internal.enrichment.orchestrator.enrichLead") + 200,
  );
  assert.match(callBlock, /overwrite/);
});

// --- Backward compatibility: force still works as before ---

test("force:true still bypasses cooldown (for programmatic/admin use)", () => {
  assert.match(
    orchestratorSource,
    /!force\s*&&\s*lead\.enrichedAt\s*&&\s*Date\.now\(\)\s*-\s*lead\.enrichedAt\s*<\s*COOLDOWN_MS/,
  );
});

test("force:true implies overwrite:true when overwrite is not set", () => {
  // overwrite defaults to force, so force:true without overwrite still overwrites fields
  assert.match(
    orchestratorSource,
    /const\s+overwrite\s*=\s*args\.overwrite\s*\?\?\s*force/,
  );
});
