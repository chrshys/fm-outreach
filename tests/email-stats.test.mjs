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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-email-stats-"));
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

test("aggregateEmailStats returns zeros when given no emails", () => {
  const { aggregateEmailStats } = loadTsModule("convex/lib/emailStats.ts");
  const now = Date.now();
  const result = aggregateEmailStats([], now);

  assert.deepEqual(result.last7Days, { sent: 0, opened: 0, clicked: 0, replied: 0 });
  assert.deepEqual(result.last30Days, { sent: 0, opened: 0, clicked: 0, replied: 0 });
});

test("aggregateEmailStats counts emails sent within last 7 days", () => {
  const { aggregateEmailStats } = loadTsModule("convex/lib/emailStats.ts");
  const now = Date.now();
  const emails = [
    { sentAt: now - 1 * MS_PER_DAY },
    { sentAt: now - 3 * MS_PER_DAY },
    { sentAt: now - 6 * MS_PER_DAY },
  ];

  const result = aggregateEmailStats(emails, now);

  assert.equal(result.last7Days.sent, 3);
  assert.equal(result.last30Days.sent, 3);
});

test("aggregateEmailStats separates 7-day and 30-day windows", () => {
  const { aggregateEmailStats } = loadTsModule("convex/lib/emailStats.ts");
  const now = Date.now();
  const emails = [
    { sentAt: now - 2 * MS_PER_DAY },   // within 7 days
    { sentAt: now - 10 * MS_PER_DAY },  // outside 7, inside 30
    { sentAt: now - 20 * MS_PER_DAY },  // outside 7, inside 30
    { sentAt: now - 45 * MS_PER_DAY },  // outside both
  ];

  const result = aggregateEmailStats(emails, now);

  assert.equal(result.last7Days.sent, 1);
  assert.equal(result.last30Days.sent, 3);
});

test("aggregateEmailStats counts opened, clicked, replied within 7 days", () => {
  const { aggregateEmailStats } = loadTsModule("convex/lib/emailStats.ts");
  const now = Date.now();
  const emails = [
    { sentAt: now - 1 * MS_PER_DAY, openedAt: now - 1 * MS_PER_DAY },
    { sentAt: now - 2 * MS_PER_DAY, openedAt: now - 2 * MS_PER_DAY, clickedAt: now - 2 * MS_PER_DAY },
    { sentAt: now - 3 * MS_PER_DAY, openedAt: now - 3 * MS_PER_DAY, clickedAt: now - 3 * MS_PER_DAY, repliedAt: now - 3 * MS_PER_DAY },
  ];

  const result = aggregateEmailStats(emails, now);

  assert.equal(result.last7Days.sent, 3);
  assert.equal(result.last7Days.opened, 3);
  assert.equal(result.last7Days.clicked, 2);
  assert.equal(result.last7Days.replied, 1);
});

test("aggregateEmailStats counts opened, clicked, replied within 30 days", () => {
  const { aggregateEmailStats } = loadTsModule("convex/lib/emailStats.ts");
  const now = Date.now();
  const emails = [
    { sentAt: now - 5 * MS_PER_DAY, openedAt: now - 5 * MS_PER_DAY },
    { sentAt: now - 15 * MS_PER_DAY, openedAt: now - 15 * MS_PER_DAY, clickedAt: now - 15 * MS_PER_DAY },
    { sentAt: now - 25 * MS_PER_DAY, repliedAt: now - 25 * MS_PER_DAY },
  ];

  const result = aggregateEmailStats(emails, now);

  assert.equal(result.last30Days.sent, 3);
  assert.equal(result.last30Days.opened, 2);
  assert.equal(result.last30Days.clicked, 1);
  assert.equal(result.last30Days.replied, 1);
});

test("aggregateEmailStats excludes emails older than 30 days entirely", () => {
  const { aggregateEmailStats } = loadTsModule("convex/lib/emailStats.ts");
  const now = Date.now();
  const emails = [
    { sentAt: now - 31 * MS_PER_DAY, openedAt: now - 31 * MS_PER_DAY, clickedAt: now - 31 * MS_PER_DAY, repliedAt: now - 31 * MS_PER_DAY },
    { sentAt: now - 60 * MS_PER_DAY },
  ];

  const result = aggregateEmailStats(emails, now);

  assert.deepEqual(result.last7Days, { sent: 0, opened: 0, clicked: 0, replied: 0 });
  assert.deepEqual(result.last30Days, { sent: 0, opened: 0, clicked: 0, replied: 0 });
});

test("aggregateEmailStats does not count emails without optional timestamps", () => {
  const { aggregateEmailStats } = loadTsModule("convex/lib/emailStats.ts");
  const now = Date.now();
  const emails = [
    { sentAt: now - 1 * MS_PER_DAY },
    { sentAt: now - 2 * MS_PER_DAY },
  ];

  const result = aggregateEmailStats(emails, now);

  assert.equal(result.last7Days.sent, 2);
  assert.equal(result.last7Days.opened, 0);
  assert.equal(result.last7Days.clicked, 0);
  assert.equal(result.last7Days.replied, 0);
});

test("convex/dashboard.ts exports emailStats query", () => {
  const source = fs.readFileSync("convex/dashboard.ts", "utf8");
  assert.match(source, /export\s+const\s+emailStats\s*=\s*query\(/);
  assert.match(source, /aggregateEmailStats/);
});
