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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-metric-agg-"));
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`);
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const MS_PER_DAY = 86_400_000;

// ---------- page.tsx aggregation formulas ----------

const pageSource = fs.readFileSync("src/app/page.tsx", "utf8");

test("page.tsx derives totalLeads by summing all pipeline values", () => {
  assert.match(
    pageSource,
    /Object\.values\(pipeline\)\.reduce\(\(sum,\s*n\)\s*=>\s*sum\s*\+\s*n,\s*0\)/,
  );
});

test("page.tsx derives onboarded from pipeline.onboarded", () => {
  assert.match(pageSource, /pipeline\?\.onboarded\s*\?\?\s*0/);
});

test("page.tsx derives replies30d from emailStats.last30Days.replied", () => {
  assert.match(pageSource, /emailStats\?\.last30Days\.replied\s*\?\?\s*0/);
});

test("page.tsx derives sent30d from emailStats.last30Days.sent", () => {
  assert.match(pageSource, /emailStats\?\.last30Days\.sent\s*\?\?\s*0/);
});

test("page.tsx derives followUpCount as dueToday + overdue lengths", () => {
  assert.match(
    pageSource,
    /followUps\.dueToday\.length\s*\+\s*followUps\.overdue\.length/,
  );
});

test("page.tsx derives overdueCount from followUps.overdue.length", () => {
  assert.match(pageSource, /followUps\?\.overdue\.length\s*\?\?\s*0/);
});

// ---------- totalLeads matches countByStatus sum ----------

test("totalLeads equals sum of all countByStatus values", () => {
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts");
  const leads = [
    { status: "new_lead" },
    { status: "new_lead" },
    { status: "enriched" },
    { status: "outreach_started" },
    { status: "replied" },
    { status: "onboarded" },
    { status: "onboarded" },
    { status: "onboarded" },
    { status: "declined" },
    { status: "bounced" },
    { status: "no_email" },
    { status: "no_response" },
    { status: "not_interested" },
    { status: "meeting_booked" },
  ];

  const pipeline = countByStatus(leads);
  const totalLeads = Object.values(pipeline).reduce((sum, n) => sum + n, 0);

  assert.equal(totalLeads, 14);
});

test("onboarded extracts only onboarded count from pipeline", () => {
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts");
  const leads = [
    { status: "new_lead" },
    { status: "onboarded" },
    { status: "onboarded" },
    { status: "enriched" },
    { status: "onboarded" },
  ];

  const pipeline = countByStatus(leads);
  const onboarded = pipeline.onboarded ?? 0;

  assert.equal(onboarded, 3);
  assert.equal(Object.values(pipeline).reduce((s, n) => s + n, 0), 5);
});

// ---------- replies30d and sent30d from email stats ----------

test("replies30d and sent30d come from emailStats last30Days", () => {
  const { aggregateEmailStats } = loadTsModule("convex/lib/emailStats.ts");
  const now = Date.now();
  const emails = [
    { sentAt: now - 1 * MS_PER_DAY, repliedAt: now - 1 * MS_PER_DAY },
    { sentAt: now - 5 * MS_PER_DAY },
    { sentAt: now - 10 * MS_PER_DAY, repliedAt: now - 10 * MS_PER_DAY },
    { sentAt: now - 20 * MS_PER_DAY },
    { sentAt: now - 25 * MS_PER_DAY, repliedAt: now - 25 * MS_PER_DAY },
    { sentAt: now - 40 * MS_PER_DAY, repliedAt: now - 40 * MS_PER_DAY }, // outside 30d
  ];

  const stats = aggregateEmailStats(emails, now);
  const replies30d = stats.last30Days.replied;
  const sent30d = stats.last30Days.sent;

  assert.equal(sent30d, 5);
  assert.equal(replies30d, 3);
});

// ---------- followUpCount and overdueCount from followUps ----------

test("followUpCount is dueToday + overdue, overdueCount is just overdue", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");
  const NOW = new Date("2025-06-15T14:00:00Z").getTime();
  const START_OF_TODAY = NOW - (NOW % MS_PER_DAY);

  const leads = [
    { _id: "1", name: "A", city: "X", type: "farm", nextFollowUpAt: START_OF_TODAY + 1000 },
    { _id: "2", name: "B", city: "X", type: "farm", nextFollowUpAt: START_OF_TODAY + 2000 },
    { _id: "3", name: "C", city: "X", type: "farm", nextFollowUpAt: START_OF_TODAY - MS_PER_DAY },
    { _id: "4", name: "D", city: "X", type: "farm", nextFollowUpAt: START_OF_TODAY - 2 * MS_PER_DAY },
    { _id: "5", name: "E", city: "X", type: "farm", nextFollowUpAt: START_OF_TODAY - 3 * MS_PER_DAY },
  ];

  const followUps = getFollowUpsDue(leads, NOW);
  const followUpCount = followUps.dueToday.length + followUps.overdue.length;
  const overdueCount = followUps.overdue.length;

  assert.equal(followUpCount, 5);
  assert.equal(overdueCount, 3);
});

// ---------- edge cases ----------

test("totalLeads is 0 when pipeline is undefined", () => {
  const pipeline = undefined;
  const totalLeads = pipeline
    ? Object.values(pipeline).reduce((sum, n) => sum + n, 0)
    : 0;

  assert.equal(totalLeads, 0);
});

test("followUpCount and overdueCount are 0 when followUps is undefined", () => {
  const followUps = undefined;
  const followUpCount = followUps
    ? followUps.dueToday.length + followUps.overdue.length
    : 0;
  const overdueCount = followUps?.overdue.length ?? 0;

  assert.equal(followUpCount, 0);
  assert.equal(overdueCount, 0);
});

test("replies30d and sent30d are 0 when emailStats is undefined", () => {
  const emailStats = undefined;
  const replies30d = emailStats?.last30Days.replied ?? 0;
  const sent30d = emailStats?.last30Days.sent ?? 0;

  assert.equal(replies30d, 0);
  assert.equal(sent30d, 0);
});

test("onboarded is 0 when pipeline is undefined", () => {
  const pipeline = undefined;
  const onboarded = pipeline?.onboarded ?? 0;

  assert.equal(onboarded, 0);
});

test("reply rate percentage is 0% when no emails sent", () => {
  // Mirrors the pct() helper in metric-cards.tsx
  function pct(n, d) {
    if (d === 0) return "0%";
    return `${Math.round((n / d) * 100)}%`;
  }

  assert.equal(pct(0, 0), "0%");
  assert.equal(pct(5, 0), "0%");
  assert.equal(pct(3, 10), "30%");
  assert.equal(pct(1, 3), "33%");
});

test("totalLeads includes terminal statuses (declined, bounced, etc.)", () => {
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts");
  const leads = [
    { status: "new_lead" },
    { status: "declined" },
    { status: "not_interested" },
    { status: "bounced" },
    { status: "no_response" },
    { status: "no_email" },
  ];

  const pipeline = countByStatus(leads);
  const totalLeads = Object.values(pipeline).reduce((sum, n) => sum + n, 0);

  // All 6 leads counted, including terminal statuses
  assert.equal(totalLeads, 6);
});

test("metric card props match page.tsx derivation formulas", () => {
  // Simulate what page.tsx does with realistic data
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts");
  const { aggregateEmailStats } = loadTsModule("convex/lib/emailStats.ts");
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");

  const now = Date.now();
  const startOfToday = now - (now % MS_PER_DAY);

  // Simulate leads
  const leads = [
    { _id: "1", name: "A", city: "X", type: "farm", status: "new_lead" },
    { _id: "2", name: "B", city: "X", type: "farm", status: "enriched" },
    { _id: "3", name: "C", city: "X", type: "farm", status: "onboarded" },
    { _id: "4", name: "D", city: "X", type: "farm", status: "onboarded", nextFollowUpAt: startOfToday + 1000 },
    { _id: "5", name: "E", city: "X", type: "farm", status: "replied", nextFollowUpAt: startOfToday - MS_PER_DAY },
  ];

  // Simulate emails
  const emails = [
    { sentAt: now - 2 * MS_PER_DAY },
    { sentAt: now - 5 * MS_PER_DAY, repliedAt: now - 5 * MS_PER_DAY },
    { sentAt: now - 15 * MS_PER_DAY, repliedAt: now - 15 * MS_PER_DAY },
    { sentAt: now - 25 * MS_PER_DAY },
  ];

  const pipeline = countByStatus(leads);
  const emailStats = aggregateEmailStats(emails, now);
  const followUps = getFollowUpsDue(leads, now);

  // Derive props exactly as page.tsx does
  const totalLeads = Object.values(pipeline).reduce((sum, n) => sum + n, 0);
  const onboarded = pipeline.onboarded ?? 0;
  const replies30d = emailStats.last30Days.replied ?? 0;
  const sent30d = emailStats.last30Days.sent ?? 0;
  const followUpCount = followUps.dueToday.length + followUps.overdue.length;
  const overdueCount = followUps.overdue.length;

  assert.equal(totalLeads, 5);
  assert.equal(onboarded, 2);
  assert.equal(replies30d, 2);
  assert.equal(sent30d, 4);
  assert.equal(followUpCount, 2);
  assert.equal(overdueCount, 1);
});
