import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const orchestratorSource = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);

const leadsSource = fs.readFileSync("convex/leads.ts", "utf8");

const statusColorsSource = fs.readFileSync(
  "src/components/map/status-colors.ts",
  "utf8",
);

const statusSelectorSource = fs.readFileSync(
  "src/components/leads/status-selector.tsx",
  "utf8",
);

// =============================================================
// Lead status transitions to "enriched" or "no_email" after
// enrichment completes.
// =============================================================

// --- Core status logic: enriched vs no_email ---

test("status is set to 'enriched' when email is found", () => {
  assert.match(
    orchestratorSource,
    /const\s+emailFound\s*=\s*!!\(patch\.contactEmail\s*\|\|\s*lead\.contactEmail\)/,
  );
  assert.match(
    orchestratorSource,
    /const\s+newStatus\s*=\s*emailFound\s*\?\s*"enriched"\s*:\s*"no_email"/,
  );
});

test("status is set to 'no_email' when no email is found", () => {
  // The ternary handles both cases — when emailFound is false, status is no_email
  assert.match(
    orchestratorSource,
    /emailFound\s*\?\s*"enriched"\s*:\s*"no_email"/,
  );
});

test("emailFound considers both new email in patch and existing email on lead", () => {
  // Must check patch.contactEmail (newly found) OR lead.contactEmail (already existed)
  assert.match(orchestratorSource, /patch\.contactEmail\s*\|\|\s*lead\.contactEmail/);
});

// --- Status progression guard ---

test("only transitions from new_lead or no_email statuses", () => {
  assert.match(
    orchestratorSource,
    /progressableStatuses\s*=\s*new\s+Set\(\["new_lead",\s*"no_email"\]\)/,
  );
});

test("checks lead.status against progressable statuses before updating", () => {
  assert.match(
    orchestratorSource,
    /progressableStatuses\.has\(lead\.status\)/,
  );
});

test("does not regress status for leads beyond new_lead/no_email", () => {
  // Status is only set in patch when lead is in a progressable status
  assert.match(
    orchestratorSource,
    /if\s*\(progressableStatuses\.has\(lead\.status\)\s*\|\|\s*force\)/,
  );
  assert.match(orchestratorSource, /patch\.status\s*=\s*newStatus/);
});

test("force flag bypasses status progression guard", () => {
  assert.match(
    orchestratorSource,
    /progressableStatuses\.has\(lead\.status\)\s*\|\|\s*force/,
  );
});

// --- no_email to enriched re-enrichment ---

test("no_email is in progressable statuses so re-enrichment can upgrade to enriched", () => {
  // This ensures a lead with no_email that later gets an email via re-enrichment
  // will be upgraded to enriched
  const statusSet = orchestratorSource.match(
    /new\s+Set\(\[([^\]]+)\]\)/,
  );
  assert.ok(statusSet, "progressableStatuses Set should exist");
  assert.match(statusSet[1], /no_email/);
  assert.match(statusSet[1], /new_lead/);
});

// --- Status is passed through leads.update which logs the change ---

test("status change is applied via leads.update mutation", () => {
  assert.match(orchestratorSource, /ctx\.runMutation\(api\.leads\.update/);
  assert.match(orchestratorSource, /\.\.\.patch/);
});

test("leads.update logs status_changed activity when status differs", () => {
  assert.match(
    leadsSource,
    /shouldLogStatusChange\s*=\s*args\.status\s*!==\s*undefined\s*&&\s*args\.status\s*!==\s*lead\.status/,
  );
  assert.match(leadsSource, /type:\s*"status_changed"/);
  assert.match(leadsSource, /oldStatus:\s*lead\.status/);
  assert.match(leadsSource, /newStatus:\s*args\.status/);
});

// --- Summary includes status ---

test("EnrichmentSummary includes status field typed as enriched | no_email", () => {
  assert.match(
    orchestratorSource,
    /status:\s*"enriched"\s*\|\s*"no_email"/,
  );
});

test("returned summary reflects computed status", () => {
  assert.match(orchestratorSource, /status:\s*newStatus/);
});

test("enrichment_finished activity metadata includes the final status", () => {
  // The metadata logged for enrichment_finished should include status
  const finishedBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("enrichment_finished"),
  );
  assert.match(finishedBlock, /status:\s*newStatus/);
});

// --- Skipped enrichment also reports correct status ---

test("skipped enrichment returns correct status based on existing email", () => {
  const skipBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("skipped: true"),
    orchestratorSource.indexOf("skipped: true") + 200,
  );
  assert.match(
    skipBlock,
    /status:\s*lead\.contactEmail\s*\?\s*"enriched"\s*:\s*"no_email"/,
  );
});

// --- UI displays both statuses ---

test("status selector includes 'enriched' option", () => {
  assert.match(statusSelectorSource, /value:\s*"enriched"/);
  assert.match(statusSelectorSource, /label:\s*"Enriched"/);
});

test("status selector includes 'no_email' option", () => {
  assert.match(statusSelectorSource, /value:\s*"no_email"/);
  assert.match(statusSelectorSource, /label:\s*"No Email"/);
});

test("map colors include enriched status", () => {
  assert.match(statusColorsSource, /enriched:/);
});

test("map colors include no_email status", () => {
  assert.match(statusColorsSource, /no_email:/);
});

// --- Schema includes both statuses ---

test("lead status validator includes enriched", () => {
  assert.match(leadsSource, /v\.literal\("enriched"\)/);
});

test("lead status validator includes no_email", () => {
  assert.match(leadsSource, /v\.literal\("no_email"\)/);
});
