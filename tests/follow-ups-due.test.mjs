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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-follow-ups-due-"));
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`);
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createLead(id, overrides = {}) {
  return {
    _id: `lead-${id}`,
    name: `Lead ${id}`,
    city: "Toronto",
    type: "farm",
    ...overrides,
  };
}

// Fixed "now" for deterministic tests: 2025-06-15 14:00:00 UTC
const NOW = new Date("2025-06-15T14:00:00Z").getTime();
const MS_PER_DAY = 86_400_000;

// Start/end of today relative to NOW (UTC-based via Date constructor)
const START_OF_TODAY = new Date("2025-06-15T00:00:00.000Z").getTime();
const END_OF_TODAY = new Date("2025-06-15T23:59:59.999Z").getTime();

test("getFollowUpsDue returns empty arrays when no leads have nextFollowUpAt", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");
  const leads = [
    createLead(1),
    createLead(2),
  ];

  const result = getFollowUpsDue(leads, NOW);

  assert.deepEqual(result.dueToday, []);
  assert.deepEqual(result.overdue, []);
});

test("getFollowUpsDue returns empty arrays when given no leads", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");
  const result = getFollowUpsDue([], NOW);

  assert.deepEqual(result.dueToday, []);
  assert.deepEqual(result.overdue, []);
});

test("getFollowUpsDue classifies leads due today correctly", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");
  const leads = [
    createLead(1, { nextFollowUpAt: START_OF_TODAY + 1000 }),
    createLead(2, { nextFollowUpAt: END_OF_TODAY - 1000 }),
  ];

  const result = getFollowUpsDue(leads, NOW);

  assert.equal(result.dueToday.length, 2);
  assert.equal(result.overdue.length, 0);
  assert.equal(result.dueToday[0]._id, "lead-1");
  assert.equal(result.dueToday[1]._id, "lead-2");
});

test("getFollowUpsDue classifies overdue leads correctly", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");
  const leads = [
    createLead(1, { nextFollowUpAt: START_OF_TODAY - MS_PER_DAY }),
    createLead(2, { nextFollowUpAt: START_OF_TODAY - 2 * MS_PER_DAY }),
  ];

  const result = getFollowUpsDue(leads, NOW);

  assert.equal(result.dueToday.length, 0);
  assert.equal(result.overdue.length, 2);
});

test("getFollowUpsDue sorts overdue by most overdue first", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");
  const leads = [
    createLead(1, { nextFollowUpAt: START_OF_TODAY - MS_PER_DAY }),      // 1 day overdue
    createLead(2, { nextFollowUpAt: START_OF_TODAY - 3 * MS_PER_DAY }),  // 3 days overdue
    createLead(3, { nextFollowUpAt: START_OF_TODAY - 2 * MS_PER_DAY }),  // 2 days overdue
  ];

  const result = getFollowUpsDue(leads, NOW);

  assert.equal(result.overdue[0]._id, "lead-2"); // most overdue
  assert.equal(result.overdue[1]._id, "lead-3");
  assert.equal(result.overdue[2]._id, "lead-1"); // least overdue
});

test("getFollowUpsDue excludes leads with nextFollowUpAt in the future", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");
  const leads = [
    createLead(1, { nextFollowUpAt: END_OF_TODAY + MS_PER_DAY }),
  ];

  const result = getFollowUpsDue(leads, NOW);

  assert.deepEqual(result.dueToday, []);
  assert.deepEqual(result.overdue, []);
});

test("getFollowUpsDue limits results to 10 per bucket", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");

  const overdueLeads = Array.from({ length: 15 }, (_, i) =>
    createLead(i + 1, { nextFollowUpAt: START_OF_TODAY - (i + 1) * MS_PER_DAY }),
  );

  const result = getFollowUpsDue(overdueLeads, NOW);

  assert.equal(result.overdue.length, 10);
});

test("getFollowUpsDue returns correct fields for each lead", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");
  const followUpTime = START_OF_TODAY + 3600_000;
  const leads = [
    createLead(1, {
      name: "Happy Farm",
      city: "Hamilton",
      type: "farmers_market",
      nextFollowUpAt: followUpTime,
    }),
  ];

  const result = getFollowUpsDue(leads, NOW);

  assert.equal(result.dueToday.length, 1);
  const item = result.dueToday[0];
  assert.equal(item._id, "lead-1");
  assert.equal(item.name, "Happy Farm");
  assert.equal(item.city, "Hamilton");
  assert.equal(item.type, "farmers_market");
  assert.equal(item.nextFollowUpAt, followUpTime);
});

test("getFollowUpsDue splits leads between dueToday and overdue correctly", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts");
  const leads = [
    createLead(1, { nextFollowUpAt: START_OF_TODAY + 1000 }),            // due today
    createLead(2, { nextFollowUpAt: START_OF_TODAY - MS_PER_DAY }),      // overdue
    createLead(3, { nextFollowUpAt: END_OF_TODAY - 1000 }),              // due today
    createLead(4, { nextFollowUpAt: START_OF_TODAY - 2 * MS_PER_DAY }), // overdue
    createLead(5, { nextFollowUpAt: END_OF_TODAY + MS_PER_DAY }),        // future — excluded
    createLead(6),                                                        // no follow-up — excluded
  ];

  const result = getFollowUpsDue(leads, NOW);

  assert.equal(result.dueToday.length, 2);
  assert.equal(result.overdue.length, 2);
});

test("convex/dashboard.ts exports followUpsDue query", () => {
  const source = fs.readFileSync("convex/dashboard.ts", "utf8");
  assert.match(source, /export\s+const\s+followUpsDue\s*=\s*query\(/);
  assert.match(source, /getFollowUpsDue/);
});
