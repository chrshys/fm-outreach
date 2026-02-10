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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-active-campaigns-"));
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`);
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("buildActiveCampaigns returns empty array when no campaigns", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const result = buildActiveCampaigns([]);
  assert.deepEqual(result, []);
});

test("buildActiveCampaigns filters only active and paused campaigns", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    { _id: "1", name: "Draft Campaign", status: "draft", leadCount: 10 },
    { _id: "2", name: "Active Campaign", status: "active", leadCount: 20, stats: { sent: 100, opened: 50, clicked: 10, replied: 5, bounced: 2 } },
    { _id: "3", name: "Paused Campaign", status: "paused", leadCount: 15, stats: { sent: 80, opened: 40, clicked: 8, replied: 4, bounced: 1 } },
    { _id: "4", name: "Completed Campaign", status: "completed", leadCount: 30 },
    { _id: "5", name: "Pushed Campaign", status: "pushed", leadCount: 5 },
  ];

  const result = buildActiveCampaigns(campaigns);

  assert.equal(result.length, 2);
  assert.equal(result[0]._id, "2");
  assert.equal(result[0].status, "active");
  assert.equal(result[1]._id, "3");
  assert.equal(result[1].status, "paused");
});

test("buildActiveCampaigns computes openRate and replyRate correctly", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    {
      _id: "1",
      name: "Test Campaign",
      status: "active",
      leadCount: 50,
      stats: { sent: 200, opened: 100, clicked: 20, replied: 10, bounced: 5 },
    },
  ];

  const result = buildActiveCampaigns(campaigns);

  assert.equal(result[0].stats.sent, 200);
  assert.equal(result[0].stats.openRate, 0.5);
  assert.equal(result[0].stats.replyRate, 0.05);
});

test("buildActiveCampaigns returns zero rates when no emails sent", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    {
      _id: "1",
      name: "New Active",
      status: "active",
      leadCount: 10,
      stats: { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 },
    },
  ];

  const result = buildActiveCampaigns(campaigns);

  assert.equal(result[0].stats.sent, 0);
  assert.equal(result[0].stats.openRate, 0);
  assert.equal(result[0].stats.replyRate, 0);
});

test("buildActiveCampaigns handles missing stats gracefully", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    { _id: "1", name: "No Stats", status: "paused", leadCount: 5 },
  ];

  const result = buildActiveCampaigns(campaigns);

  assert.equal(result.length, 1);
  assert.equal(result[0].stats.sent, 0);
  assert.equal(result[0].stats.openRate, 0);
  assert.equal(result[0].stats.replyRate, 0);
});

test("buildActiveCampaigns includes name and leadCount in results", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    { _id: "1", name: "Ontario Farms", status: "active", leadCount: 42, stats: { sent: 10, opened: 5, clicked: 2, replied: 1, bounced: 0 } },
  ];

  const result = buildActiveCampaigns(campaigns);

  assert.equal(result[0].name, "Ontario Farms");
  assert.equal(result[0].leadCount, 42);
});

test("convex/dashboard.ts exports activeCampaigns query", () => {
  const source = fs.readFileSync("convex/dashboard.ts", "utf8");
  assert.match(source, /export\s+const\s+activeCampaigns\s*=\s*query\(/);
  assert.match(source, /buildActiveCampaigns/);
});
