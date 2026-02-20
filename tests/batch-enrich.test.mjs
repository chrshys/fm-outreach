import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "convex/enrichment/batchEnrich.ts",
  "utf8",
);

// --- Action structure ---

test("batchEnrichLeads is exported as an internalAction", () => {
  assert.match(source, /export\s+const\s+batchEnrichLeads\s*=\s*internalAction\(/);
});

test("action accepts leadIds array and optional force args", () => {
  assert.match(source, /leadIds:\s*v\.array\(v\.id\("leads"\)\)/);
  assert.match(source, /force:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("action returns BatchEnrichmentResult type", () => {
  assert.match(source, /export\s+type\s+BatchEnrichmentResult\s*=/);
  assert.match(source, /Promise<BatchEnrichmentResult>/);
});

// --- BatchEnrichmentResult shape ---

test("BatchEnrichmentResult has total, succeeded, failed, skipped counts", () => {
  assert.match(source, /total:\s*number/);
  assert.match(source, /succeeded:\s*number/);
  assert.match(source, /failed:\s*number/);
  assert.match(source, /skipped:\s*number/);
});

test("BatchEnrichmentResult has results array with per-lead outcomes", () => {
  assert.match(source, /results:\s*Array</);
  assert.match(source, /status:\s*"success"/);
  assert.match(source, /summary:\s*EnrichmentSummary/);
  assert.match(source, /status:\s*"error"/);
  assert.match(source, /error:\s*string/);
});

// --- Batch size cap ---

test("caps batch at MAX_BATCH_SIZE of 25", () => {
  assert.match(source, /MAX_BATCH_SIZE\s*=\s*25/);
  assert.match(source, /leadIds\.slice\(0,\s*MAX_BATCH_SIZE\)/);
});

// --- Sequential processing with delay ---

test("processes leads sequentially in a for loop", () => {
  assert.match(source, /for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*leadIds\.length;\s*i\+\+\)/);
});

test("delays 1 second between leads", () => {
  assert.match(source, /DELAY_BETWEEN_LEADS_MS\s*=\s*1000/);
  assert.match(source, /await\s+sleep\(DELAY_BETWEEN_LEADS_MS\)/);
});

test("skips delay after last lead", () => {
  assert.match(source, /i\s*<\s*leadIds\.length\s*-\s*1/);
});

test("sleep helper uses setTimeout promise", () => {
  assert.match(source, /function\s+sleep\(/);
  assert.match(source, /new\s+Promise/);
  assert.match(source, /setTimeout\(resolve/);
});

// --- Calls orchestrator enrichLead ---

test("calls enrichLead orchestrator for each lead", () => {
  assert.match(source, /ctx\.runAction\(/);
  assert.match(source, /internal\.enrichment\.orchestrator\.enrichLead/);
  assert.match(source, /leadId,\s*force/);
});

// --- Error handling ---

test("catches errors per lead and continues batch", () => {
  assert.match(source, /try\s*\{/);
  assert.match(source, /catch\s*\(err\)/);
  assert.match(source, /err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*String\(err\)/);
});

test("pushes error result for failed leads", () => {
  assert.match(source, /status:\s*"error",\s*error:\s*message/);
  assert.match(source, /failed\+\+/);
});

// --- Counting ---

test("increments skipped counter when summary.skipped is true", () => {
  assert.match(source, /summary\.skipped/);
  assert.match(source, /skipped\+\+/);
});

test("increments succeeded counter for non-skipped success", () => {
  assert.match(source, /succeeded\+\+/);
});

// --- Return value ---

test("returns total, succeeded, failed, skipped, and results", () => {
  assert.match(source, /total:\s*leadIds\.length/);
  assert.match(source, /succeeded/);
  assert.match(source, /failed/);
  assert.match(source, /skipped/);
  assert.match(source, /results/);
});

// --- Imports ---

test("imports internal from generated api", () => {
  assert.match(source, /import.*internal.*from.*_generated\/api/);
});

test("imports internalAction from generated server", () => {
  assert.match(source, /import.*internalAction.*from.*_generated\/server/);
});

test("imports EnrichmentSummary type from orchestrator", () => {
  assert.match(source, /import\s+type.*EnrichmentSummary.*from.*orchestrator/);
});

// --- Force passthrough ---

test("passes force flag to each enrichLead call", () => {
  assert.match(source, /force\s*=\s*args\.force\s*\?\?\s*false/);
});

// --- useSonarPro passthrough ---

test("accepts optional useSonarPro arg", () => {
  assert.match(source, /useSonarPro:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("passes useSonarPro to each enrichLead call", () => {
  assert.match(source, /useSonarPro:\s*args\.useSonarPro/);
});

// --- useApify passthrough ---

test("accepts optional useApify arg", () => {
  assert.match(source, /useApify:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("passes useApify to each enrichLead call", () => {
  assert.match(source, /useApify:\s*args\.useApify/);
});
