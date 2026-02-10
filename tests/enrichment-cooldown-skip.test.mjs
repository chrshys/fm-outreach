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

const helpersSource = fs.readFileSync(
  "convex/enrichment/orchestratorHelpers.ts",
  "utf8",
);

const dataFreshnessSource = fs.readFileSync(
  "src/components/leads/data-freshness.tsx",
  "utf8",
);

const bulkActionsSource = fs.readFileSync(
  "src/components/leads/bulk-actions.tsx",
  "utf8",
);

// =============================================================
// When enrichment runs on an already-enriched lead within 30
// days, the pipeline should skip and return early without
// making any external API calls.
// =============================================================

// --- Cooldown constant ---

test("COOLDOWN_MS is defined as exactly 30 days in milliseconds", () => {
  assert.match(
    orchestratorSource,
    /const\s+COOLDOWN_MS\s*=\s*30\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/,
  );
});

// --- Cooldown check runs before any enrichment steps ---

test("cooldown check is Step 1 — before any external API calls", () => {
  const cooldownIndex = orchestratorSource.indexOf("// Step 1: Check cooldown");
  const step2Index = orchestratorSource.indexOf("// Step 2: Log enrichment started");
  const placesIndex = orchestratorSource.indexOf("// Step 3: Google Places");

  assert.ok(cooldownIndex >= 0, "Step 1 cooldown comment should exist");
  assert.ok(step2Index >= 0, "Step 2 comment should exist");
  assert.ok(placesIndex >= 0, "Step 3 comment should exist");
  assert.ok(cooldownIndex < step2Index, "Cooldown check must come before enrichment start log");
  assert.ok(cooldownIndex < placesIndex, "Cooldown check must come before Google Places call");
});

// --- Cooldown guard logic ---

test("cooldown guard checks enrichedAt exists and is within 30 days", () => {
  assert.match(orchestratorSource, /lead\.enrichedAt/);
  assert.match(
    orchestratorSource,
    /Date\.now\(\)\s*-\s*lead\.enrichedAt\s*<\s*COOLDOWN_MS/,
  );
});

test("cooldown guard is bypassed when force is true", () => {
  // The condition must include !force as the first check
  assert.match(
    orchestratorSource,
    /!force\s*&&\s*lead\.enrichedAt\s*&&\s*Date\.now\(\)\s*-\s*lead\.enrichedAt\s*<\s*COOLDOWN_MS/,
  );
});

test("cooldown guard does NOT skip when enrichedAt is undefined (never enriched)", () => {
  // The condition requires lead.enrichedAt to be truthy
  assert.match(orchestratorSource, /lead\.enrichedAt\s*&&/);
});

// --- Skip behavior: early return ---

test("returns skipped: true with empty sources and fieldsUpdated when cooldown applies", () => {
  // Find the cooldown skip return block
  const cooldownBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 1: Check cooldown"),
    orchestratorSource.indexOf("// Step 2:"),
  );

  assert.match(cooldownBlock, /skipped:\s*true/);
  assert.match(cooldownBlock, /sources:\s*\[\]/);
  assert.match(cooldownBlock, /fieldsUpdated:\s*\[\]/);
});

test("skipped return includes correct status based on existing email", () => {
  const cooldownBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 1: Check cooldown"),
    orchestratorSource.indexOf("// Step 2:"),
  );

  assert.match(
    cooldownBlock,
    /status:\s*lead\.contactEmail\s*\?\s*"enriched"\s*:\s*"no_email"/,
  );
});

test("skipped return includes emailFound based on existing contactEmail", () => {
  const cooldownBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 1: Check cooldown"),
    orchestratorSource.indexOf("// Step 2:"),
  );

  assert.match(cooldownBlock, /emailFound:\s*!!lead\.contactEmail/);
});

// --- Activity logging for skipped enrichment ---

test("logs enrichment_skipped activity when cooldown applies", () => {
  const cooldownBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 1: Check cooldown"),
    orchestratorSource.indexOf("// Step 2:"),
  );

  assert.match(cooldownBlock, /enrichment_skipped/);
  assert.match(cooldownBlock, /enriched within last 30 days/);
});

test("enrichment_skipped activity includes enrichedAt in metadata", () => {
  const cooldownBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 1: Check cooldown"),
    orchestratorSource.indexOf("// Step 2:"),
  );

  assert.match(cooldownBlock, /metadata:\s*\{\s*enrichedAt:\s*lead\.enrichedAt\s*\}/);
});

test("enrichment_skipped is a valid activity type in orchestratorHelpers", () => {
  assert.match(helpersSource, /v\.literal\("enrichment_skipped"\)/);
});

// --- Batch enrichment correctly counts skipped leads ---

test("batch enrichment increments skipped counter for cooldown-skipped leads", () => {
  assert.match(batchSource, /if\s*\(summary\.skipped\)/);
  assert.match(batchSource, /skipped\+\+/);
});

test("batch enrichment returns skipped count in result", () => {
  assert.match(batchSource, /skipped:\s*number/);
  assert.match(batchSource, /skipped/);
});

test("skipped leads are still included as success in batch results", () => {
  // Skipped leads get status: "success" (not "error"), they just increment skipped counter
  const loopBlock = batchSource.slice(
    batchSource.indexOf("for (let i"),
    batchSource.indexOf("return {"),
  );

  // The success push happens before the skipped check
  assert.match(loopBlock, /results\.push\(\{\s*leadId,\s*status:\s*"success",\s*summary\s*\}\)/);
  assert.match(loopBlock, /summary\.skipped/);
});

// --- UI: Bulk actions don't pass force, respecting cooldown ---

test("bulk enrich action does not pass force: true by default", () => {
  // Extract the handleEnrichSelected function body
  const fnStart = bulkActionsSource.indexOf("async function handleEnrichSelected");
  const fnBody = bulkActionsSource.slice(fnStart, fnStart + 500);

  assert.match(fnBody, /batchEnrich\(\{\s*leadIds:\s*selectedLeadIds\s*\}\)/);
  assert.doesNotMatch(fnBody, /force:\s*true/);
});

// --- UI: Single lead re-enrich passes overwrite (NOT force) so cooldown is respected ---

test("single lead re-enrich button passes overwrite: true (not force) for already-enriched leads", () => {
  assert.match(
    dataFreshnessSource,
    /overwrite:\s*hasBeenEnriched\s*\?\s*true\s*:\s*undefined/,
  );
});

test("single lead re-enrich button does NOT pass force: true", () => {
  // Extract the handleEnrich function body
  const fnStart = dataFreshnessSource.indexOf("async function handleEnrich");
  const fnBody = dataFreshnessSource.slice(fnStart, fnStart + 500);
  assert.doesNotMatch(fnBody, /force:\s*true/);
  assert.doesNotMatch(fnBody, /force:\s*hasBeenEnriched/);
});

// --- UI: Data freshness shows staleness levels aligned with cooldown ---

test("data freshness considers leads enriched within 30 days as 'fresh'", () => {
  const enrichmentLibSource = fs.readFileSync("src/lib/enrichment.ts", "utf8");
  assert.match(enrichmentLibSource, /if\s*\(daysSince\s*<\s*30\)\s*return\s*"fresh"/);
});

test("data freshness shows 'aging' for 30-90 days", () => {
  const enrichmentLibSource = fs.readFileSync("src/lib/enrichment.ts", "utf8");
  assert.match(enrichmentLibSource, /if\s*\(daysSince\s*<=\s*90\)\s*return\s*"aging"/);
});

test("data freshness shows 'stale' after 90 days", () => {
  const enrichmentLibSource = fs.readFileSync("src/lib/enrichment.ts", "utf8");
  assert.match(enrichmentLibSource, /return\s*"stale"/);
});

// --- UI: Toast messages communicate skipped results ---

test("bulk actions toast shows skipped count", () => {
  assert.match(bulkActionsSource, /skipped/);
  assert.match(
    bulkActionsSource,
    /\$\{succeeded\}\s*enriched,\s*\$\{skipped\}\s*skipped/,
  );
});

test("single-lead enrichment shows 'Enrichment skipped' toast when result is skipped", () => {
  assert.match(dataFreshnessSource, /Enrichment skipped/);
});
