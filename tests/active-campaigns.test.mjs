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
  const result = buildActiveCampaigns([], []);
  assert.deepEqual(result, []);
});

test("buildActiveCampaigns filters only active and paused campaigns", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    { _id: "1", name: "Draft Campaign", status: "draft", leadCount: 10 },
    { _id: "2", name: "Active Campaign", status: "active", leadCount: 20, smartleadCampaignId: "sl-2" },
    { _id: "3", name: "Paused Campaign", status: "paused", leadCount: 15, smartleadCampaignId: "sl-3" },
    { _id: "4", name: "Completed Campaign", status: "completed", leadCount: 30 },
    { _id: "5", name: "Pushed Campaign", status: "pushed", leadCount: 5 },
  ];

  const result = buildActiveCampaigns(campaigns, []);

  assert.equal(result.length, 2);
  assert.equal(result[0]._id, "2");
  assert.equal(result[0].status, "active");
  assert.equal(result[1]._id, "3");
  assert.equal(result[1].status, "paused");
});

test("buildActiveCampaigns computes openRate and replyRate from email records", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    {
      _id: "1",
      name: "Test Campaign",
      status: "active",
      leadCount: 50,
      smartleadCampaignId: "sl-1",
    },
  ];
  const emails = [
    ...Array.from({ length: 200 }, (_, i) => ({
      smartleadCampaignId: "sl-1",
      ...(i < 100 ? { openedAt: Date.now() } : {}),
      ...(i < 10 ? { repliedAt: Date.now() } : {}),
    })),
  ];

  const result = buildActiveCampaigns(campaigns, emails);

  assert.equal(result[0].stats.sent, 200);
  assert.equal(result[0].stats.openRate, 0.5);
  assert.equal(result[0].stats.replyRate, 0.05);
});

test("buildActiveCampaigns returns zero rates when no emails exist for campaign", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    {
      _id: "1",
      name: "New Active",
      status: "active",
      leadCount: 10,
      smartleadCampaignId: "sl-1",
    },
  ];

  const result = buildActiveCampaigns(campaigns, []);

  assert.equal(result[0].stats.sent, 0);
  assert.equal(result[0].stats.openRate, 0);
  assert.equal(result[0].stats.replyRate, 0);
});

test("buildActiveCampaigns handles campaign without smartleadCampaignId", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    { _id: "1", name: "No Smartlead", status: "paused", leadCount: 5 },
  ];

  const result = buildActiveCampaigns(campaigns, []);

  assert.equal(result.length, 1);
  assert.equal(result[0].stats.sent, 0);
  assert.equal(result[0].stats.openRate, 0);
  assert.equal(result[0].stats.replyRate, 0);
});

test("buildActiveCampaigns includes name and leadCount in results", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    { _id: "1", name: "Ontario Farms", status: "active", leadCount: 42, smartleadCampaignId: "sl-1" },
  ];
  const emails = [
    { smartleadCampaignId: "sl-1", openedAt: Date.now() },
  ];

  const result = buildActiveCampaigns(campaigns, emails);

  assert.equal(result[0].name, "Ontario Farms");
  assert.equal(result[0].leadCount, 42);
});

test("buildActiveCampaigns only counts emails matching campaign smartleadCampaignId", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts");
  const campaigns = [
    { _id: "1", name: "Camp A", status: "active", leadCount: 10, smartleadCampaignId: "sl-a" },
    { _id: "2", name: "Camp B", status: "active", leadCount: 5, smartleadCampaignId: "sl-b" },
  ];
  const emails = [
    { smartleadCampaignId: "sl-a" },
    { smartleadCampaignId: "sl-a", openedAt: Date.now() },
    { smartleadCampaignId: "sl-a", openedAt: Date.now(), repliedAt: Date.now() },
    { smartleadCampaignId: "sl-b" },
    { smartleadCampaignId: "sl-b", openedAt: Date.now() },
    { smartleadCampaignId: "sl-unrelated" },
  ];

  const result = buildActiveCampaigns(campaigns, emails);

  assert.equal(result[0].stats.sent, 3);
  assert.equal(result[0].stats.openRate, 2 / 3);
  assert.equal(result[0].stats.replyRate, 1 / 3);
  assert.equal(result[1].stats.sent, 2);
  assert.equal(result[1].stats.openRate, 0.5);
  assert.equal(result[1].stats.replyRate, 0);
});

test("convex/dashboard.ts exports activeCampaigns query that uses emails table", () => {
  const source = fs.readFileSync("convex/dashboard.ts", "utf8");
  assert.match(source, /export\s+const\s+activeCampaigns\s*=\s*query\(/);
  assert.match(source, /buildActiveCampaigns/);
  assert.match(source, /ctx\.db\.query\("emails"\)/);
});
