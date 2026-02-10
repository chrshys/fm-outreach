import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadTsModule(relativePath) {
  const source = fs.readFileSync(relativePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: path.basename(relativePath),
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-pipeline-stats-"));
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`);
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("countByStatus returns zero for all statuses when given no leads", () => {
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts");
  const result = countByStatus([]);

  assert.equal(result.new_lead, 0);
  assert.equal(result.enriched, 0);
  assert.equal(result.outreach_started, 0);
  assert.equal(result.replied, 0);
  assert.equal(result.meeting_booked, 0);
  assert.equal(result.onboarded, 0);
  assert.equal(result.no_email, 0);
  assert.equal(result.declined, 0);
  assert.equal(result.not_interested, 0);
  assert.equal(result.bounced, 0);
  assert.equal(result.no_response, 0);
});

test("countByStatus counts leads per status correctly", () => {
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts");
  const leads = [
    { status: "new_lead" },
    { status: "new_lead" },
    { status: "enriched" },
    { status: "outreach_started" },
    { status: "outreach_started" },
    { status: "outreach_started" },
    { status: "replied" },
    { status: "meeting_booked" },
    { status: "onboarded" },
    { status: "declined" },
    { status: "not_interested" },
    { status: "bounced" },
    { status: "no_response" },
    { status: "no_email" },
    { status: "no_email" },
  ];

  const result = countByStatus(leads);

  assert.equal(result.new_lead, 2);
  assert.equal(result.enriched, 1);
  assert.equal(result.outreach_started, 3);
  assert.equal(result.replied, 1);
  assert.equal(result.meeting_booked, 1);
  assert.equal(result.onboarded, 1);
  assert.equal(result.declined, 1);
  assert.equal(result.not_interested, 1);
  assert.equal(result.bounced, 1);
  assert.equal(result.no_response, 1);
  assert.equal(result.no_email, 2);
});

test("countByStatus includes all 11 status keys in result", () => {
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts");
  const result = countByStatus([]);
  const keys = Object.keys(result).sort();

  assert.deepEqual(keys, [
    "bounced",
    "declined",
    "enriched",
    "meeting_booked",
    "new_lead",
    "no_email",
    "no_response",
    "not_interested",
    "onboarded",
    "outreach_started",
    "replied",
  ]);
});

test("countByStatus ignores leads with unknown status values", () => {
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts");
  const leads = [
    { status: "new_lead" },
    { status: "unknown_status" },
    { status: "new_lead" },
  ];

  const result = countByStatus(leads);

  assert.equal(result.new_lead, 2);
  // Total of all counts should be 2, not 3
  const total = Object.values(result).reduce((sum, n) => sum + n, 0);
  assert.equal(total, 2);
});

test("convex/dashboard.ts exports pipelineStats query", () => {
  const source = fs.readFileSync("convex/dashboard.ts", "utf8");
  assert.match(source, /export\s+const\s+pipelineStats\s*=\s*query\(/);
  assert.match(source, /countByStatus/);
});
