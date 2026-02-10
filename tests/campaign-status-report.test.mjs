import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadFormatter() {
  const source = fs.readFileSync("scripts/lib/formatCampaignStatus.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "formatCampaignStatus.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-outreach-campaign-"));
  const modulePath = path.join(tempDir, "formatCampaignStatus.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const NOW = 1707580800000; // 2024-02-11 00:00:00 UTC

// --- Empty campaigns ---

test("formatCampaignStatusReport shows (no campaigns) when empty", () => {
  const { formatCampaignStatusReport } = loadFormatter();
  const out = formatCampaignStatusReport([]);
  assert.ok(out.includes("CAMPAIGN STATUS"));
  assert.ok(out.includes("(no campaigns)"));
});

// --- Single campaign with stats ---

test("formatCampaignStatusReport shows campaign name and status", () => {
  const { formatCampaignStatusReport } = loadFormatter();
  const campaigns = [
    {
      _id: "1",
      name: "Spring Outreach",
      status: "active",
      leadCount: 50,
      stats: { sent: 100, opened: 40, clicked: 10, replied: 5, bounced: 3 },
      updatedAt: NOW,
    },
  ];
  const out = formatCampaignStatusReport(campaigns);
  assert.ok(out.includes("Spring Outreach"));
  assert.ok(out.includes("ACTIVE"));
});

test("formatCampaignStatusReport shows lead count", () => {
  const { formatCampaignStatusReport } = loadFormatter();
  const campaigns = [
    {
      _id: "1",
      name: "Test Campaign",
      status: "active",
      leadCount: 75,
      stats: { sent: 200, opened: 80, clicked: 20, replied: 10, bounced: 5 },
      updatedAt: NOW,
    },
  ];
  const out = formatCampaignStatusReport(campaigns);
  assert.ok(out.includes("75"));
});

test("formatCampaignStatusReport shows sent/opened/replied/bounced counts", () => {
  const { formatCampaignStatusReport } = loadFormatter();
  const campaigns = [
    {
      _id: "1",
      name: "Stats Test",
      status: "active",
      leadCount: 25,
      stats: { sent: 100, opened: 40, clicked: 10, replied: 8, bounced: 3 },
      updatedAt: NOW,
    },
  ];
  const out = formatCampaignStatusReport(campaigns);
  assert.ok(out.includes("100"), "Expected sent count 100");
  assert.ok(out.includes("40"), "Expected opened count 40");
  assert.ok(out.includes("8"), "Expected replied count 8");
  assert.ok(out.includes("3"), "Expected bounced count 3");
});

test("formatCampaignStatusReport shows percentages for opened/replied/bounced", () => {
  const { formatCampaignStatusReport } = loadFormatter();
  const campaigns = [
    {
      _id: "1",
      name: "Pct Test",
      status: "active",
      leadCount: 10,
      stats: { sent: 200, opened: 80, clicked: 20, replied: 10, bounced: 6 },
      updatedAt: NOW,
    },
  ];
  const out = formatCampaignStatusReport(campaigns);
  assert.ok(out.includes("40.0%"), "Expected opened rate 40.0%");
  assert.ok(out.includes("5.0%"), "Expected replied rate 5.0%");
  assert.ok(out.includes("3.0%"), "Expected bounced rate 3.0%");
});

test("formatCampaignStatusReport shows last sync time", () => {
  const { formatCampaignStatusReport } = loadFormatter();
  const campaigns = [
    {
      _id: "1",
      name: "Sync Test",
      status: "paused",
      leadCount: 5,
      stats: { sent: 10, opened: 4, clicked: 1, replied: 0, bounced: 0 },
      updatedAt: NOW,
    },
  ];
  const out = formatCampaignStatusReport(campaigns);
  assert.ok(out.includes("Last Sync"));
  assert.ok(out.includes("2024"), "Expected year in timestamp");
});

// --- Campaign without stats (draft) ---

test("formatCampaignStatusReport handles missing stats gracefully", () => {
  const { formatCampaignStatusReport } = loadFormatter();
  const campaigns = [
    {
      _id: "1",
      name: "Draft Campaign",
      status: "draft",
      leadCount: 30,
      stats: undefined,
      updatedAt: NOW,
    },
  ];
  const out = formatCampaignStatusReport(campaigns);
  assert.ok(out.includes("Draft Campaign"));
  assert.ok(out.includes("DRAFT"));
  assert.ok(out.includes("30"));
  // Sent should be 0 and percentages should show dash
  assert.ok(out.includes("—"), "Expected dash for zero-sent percentage");
});

// --- Multiple campaigns ---

test("formatCampaignStatusReport shows all campaigns", () => {
  const { formatCampaignStatusReport } = loadFormatter();
  const campaigns = [
    {
      _id: "1",
      name: "Campaign Alpha",
      status: "active",
      leadCount: 50,
      stats: { sent: 100, opened: 40, clicked: 10, replied: 5, bounced: 2 },
      updatedAt: NOW,
    },
    {
      _id: "2",
      name: "Campaign Beta",
      status: "paused",
      leadCount: 20,
      stats: { sent: 40, opened: 15, clicked: 3, replied: 1, bounced: 0 },
      updatedAt: NOW,
    },
    {
      _id: "3",
      name: "Campaign Gamma",
      status: "completed",
      leadCount: 100,
      stats: { sent: 300, opened: 150, clicked: 45, replied: 30, bounced: 10 },
      updatedAt: NOW,
    },
  ];
  const out = formatCampaignStatusReport(campaigns);
  assert.ok(out.includes("Campaign Alpha"));
  assert.ok(out.includes("Campaign Beta"));
  assert.ok(out.includes("Campaign Gamma"));
  assert.ok(out.includes("3 campaign(s) total"));
});

// --- Status badges ---

test("formatCampaignStatusReport shows correct status badges", () => {
  const { formatCampaignStatusReport } = loadFormatter();
  const statuses = ["draft", "pushed", "active", "paused", "completed"];
  const expected = ["DRAFT", "PUSHED", "ACTIVE", "PAUSED", "DONE"];

  for (let i = 0; i < statuses.length; i++) {
    const campaigns = [
      {
        _id: String(i),
        name: `Campaign ${i}`,
        status: statuses[i],
        leadCount: 1,
        stats: undefined,
        updatedAt: NOW,
      },
    ];
    const out = formatCampaignStatusReport(campaigns);
    assert.ok(
      out.includes(expected[i]),
      `Expected badge ${expected[i]} for status ${statuses[i]}`,
    );
  }
});

// --- Total count ---

test("formatCampaignStatusReport shows correct total count", () => {
  const { formatCampaignStatusReport } = loadFormatter();
  const campaigns = [
    { _id: "1", name: "A", status: "active", leadCount: 1, stats: undefined, updatedAt: NOW },
    { _id: "2", name: "B", status: "draft", leadCount: 2, stats: undefined, updatedAt: NOW },
  ];
  const out = formatCampaignStatusReport(campaigns);
  assert.ok(out.includes("2 campaign(s) total"));
});
