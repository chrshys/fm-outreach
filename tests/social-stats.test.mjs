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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-social-stats-"));
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

test("aggregateSocialStats returns zeros when given no activities", () => {
  const { aggregateSocialStats } = loadTsModule("convex/lib/socialStats.ts");
  const now = Date.now();
  const result = aggregateSocialStats([], now);

  assert.deepEqual(result.last7Days, { dmsSent: 0, dmReplies: 0, follows: 0 });
  assert.deepEqual(result.last30Days, { dmsSent: 0, dmReplies: 0, follows: 0 });
});

test("aggregateSocialStats counts social activities within last 7 days", () => {
  const { aggregateSocialStats } = loadTsModule("convex/lib/socialStats.ts");
  const now = Date.now();
  const activities = [
    { type: "social_dm_sent", createdAt: now - 1 * MS_PER_DAY },
    { type: "social_dm_replied", createdAt: now - 2 * MS_PER_DAY },
    { type: "social_followed", createdAt: now - 3 * MS_PER_DAY },
  ];

  const result = aggregateSocialStats(activities, now);

  assert.equal(result.last7Days.dmsSent, 1);
  assert.equal(result.last7Days.dmReplies, 1);
  assert.equal(result.last7Days.follows, 1);
  assert.equal(result.last30Days.dmsSent, 1);
  assert.equal(result.last30Days.dmReplies, 1);
  assert.equal(result.last30Days.follows, 1);
});

test("aggregateSocialStats separates 7-day and 30-day windows", () => {
  const { aggregateSocialStats } = loadTsModule("convex/lib/socialStats.ts");
  const now = Date.now();
  const activities = [
    { type: "social_dm_sent", createdAt: now - 2 * MS_PER_DAY },   // within 7 days
    { type: "social_dm_sent", createdAt: now - 10 * MS_PER_DAY },  // outside 7, inside 30
    { type: "social_dm_sent", createdAt: now - 20 * MS_PER_DAY },  // outside 7, inside 30
    { type: "social_dm_sent", createdAt: now - 45 * MS_PER_DAY },  // outside both
  ];

  const result = aggregateSocialStats(activities, now);

  assert.equal(result.last7Days.dmsSent, 1);
  assert.equal(result.last30Days.dmsSent, 3);
});

test("aggregateSocialStats ignores non-social activity types", () => {
  const { aggregateSocialStats } = loadTsModule("convex/lib/socialStats.ts");
  const now = Date.now();
  const activities = [
    { type: "email_sent", createdAt: now - 1 * MS_PER_DAY },
    { type: "phone_call", createdAt: now - 1 * MS_PER_DAY },
    { type: "note_added", createdAt: now - 1 * MS_PER_DAY },
    { type: "social_dm_sent", createdAt: now - 1 * MS_PER_DAY },
  ];

  const result = aggregateSocialStats(activities, now);

  assert.equal(result.last7Days.dmsSent, 1);
  assert.equal(result.last7Days.dmReplies, 0);
  assert.equal(result.last7Days.follows, 0);
});

test("aggregateSocialStats excludes activities older than 30 days", () => {
  const { aggregateSocialStats } = loadTsModule("convex/lib/socialStats.ts");
  const now = Date.now();
  const activities = [
    { type: "social_dm_sent", createdAt: now - 31 * MS_PER_DAY },
    { type: "social_dm_replied", createdAt: now - 60 * MS_PER_DAY },
    { type: "social_followed", createdAt: now - 45 * MS_PER_DAY },
  ];

  const result = aggregateSocialStats(activities, now);

  assert.deepEqual(result.last7Days, { dmsSent: 0, dmReplies: 0, follows: 0 });
  assert.deepEqual(result.last30Days, { dmsSent: 0, dmReplies: 0, follows: 0 });
});

test("aggregateSocialStats ignores social_commented type", () => {
  const { aggregateSocialStats } = loadTsModule("convex/lib/socialStats.ts");
  const now = Date.now();
  const activities = [
    { type: "social_commented", createdAt: now - 1 * MS_PER_DAY },
    { type: "social_dm_sent", createdAt: now - 1 * MS_PER_DAY },
  ];

  const result = aggregateSocialStats(activities, now);

  assert.equal(result.last7Days.dmsSent, 1);
  const total = result.last7Days.dmsSent + result.last7Days.dmReplies + result.last7Days.follows;
  assert.equal(total, 1);
});

test("aggregateSocialStats counts multiple of same type correctly", () => {
  const { aggregateSocialStats } = loadTsModule("convex/lib/socialStats.ts");
  const now = Date.now();
  const activities = [
    { type: "social_dm_sent", createdAt: now - 1 * MS_PER_DAY },
    { type: "social_dm_sent", createdAt: now - 2 * MS_PER_DAY },
    { type: "social_dm_sent", createdAt: now - 3 * MS_PER_DAY },
    { type: "social_dm_replied", createdAt: now - 1 * MS_PER_DAY },
    { type: "social_dm_replied", createdAt: now - 5 * MS_PER_DAY },
    { type: "social_followed", createdAt: now - 6 * MS_PER_DAY },
  ];

  const result = aggregateSocialStats(activities, now);

  assert.equal(result.last7Days.dmsSent, 3);
  assert.equal(result.last7Days.dmReplies, 2);
  assert.equal(result.last7Days.follows, 1);
});

test("convex/dashboard.ts exports socialStats query", () => {
  const source = fs.readFileSync("convex/dashboard.ts", "utf8");
  assert.match(source, /export\s+const\s+socialStats\s*=\s*query\(/);
  assert.match(source, /aggregateSocialStats/);
});
