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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-activities-list-"));
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`);
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createActivity(index, overrides = {}) {
  return {
    _id: `activity-${index}`,
    leadId: "lead-1",
    createdAt: index,
    ...overrides,
  };
}

test("listActivitiesPage returns 20 results sorted by createdAt desc with cursor pagination", () => {
  const { listActivitiesPage } = loadTsModule("convex/lib/activitiesList.ts");
  const activities = Array.from({ length: 25 }, (_, i) => createActivity(i + 1));

  const firstPage = listActivitiesPage(activities, {
    pageSize: 20,
  });

  assert.equal(firstPage.activities.length, 20);
  assert.equal(firstPage.activities[0].createdAt, 25);
  assert.equal(firstPage.activities[19].createdAt, 6);
  assert.equal(firstPage.cursor, "20");

  const secondPage = listActivitiesPage(activities, {
    cursor: firstPage.cursor,
    pageSize: 20,
  });

  assert.equal(secondPage.activities.length, 5);
  assert.equal(secondPage.activities[0].createdAt, 5);
  assert.equal(secondPage.activities[4].createdAt, 1);
  assert.equal(secondPage.cursor, null);
});

test("listActivitiesPage uses first page when cursor is invalid", () => {
  const { listActivitiesPage } = loadTsModule("convex/lib/activitiesList.ts");
  const activities = Array.from({ length: 3 }, (_, i) => createActivity(i + 1));

  const page = listActivitiesPage(activities, {
    cursor: "not-a-number",
    pageSize: 20,
  });

  assert.deepEqual(
    page.activities.map((activity) => activity.createdAt),
    [3, 2, 1],
  );
});

test("convex activities listByLead query is exported with leadId and cursor args and page size 20", () => {
  const source = fs.readFileSync("convex/activities.ts", "utf8");

  assert.match(source, /export\s+const\s+listByLead\s*=\s*query\(/);
  assert.match(source, /leadId:\s*v\.id\("leads"\)/);
  assert.match(source, /cursor:\s*v\.optional\(v\.string\(\)\)/);
  assert.match(source, /withIndex\("by_leadId"/);
  assert.match(source, /pageSize:\s*20/);
});
