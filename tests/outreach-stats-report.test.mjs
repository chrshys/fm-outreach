import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadFormatter() {
  const source = fs.readFileSync("scripts/lib/formatOutreachReport.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "formatOutreachReport.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-outreach-report-"));
  const modulePath = path.join(tempDir, "formatOutreachReport.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const EMPTY_PIPELINE = {
  new_lead: 0,
  enriched: 0,
  outreach_started: 0,
  replied: 0,
  meeting_booked: 0,
  onboarded: 0,
  no_email: 0,
  declined: 0,
  not_interested: 0,
  bounced: 0,
  no_response: 0,
};

const EMPTY_EMAIL = {
  last7Days: { sent: 0, opened: 0, clicked: 0, replied: 0 },
  last30Days: { sent: 0, opened: 0, clicked: 0, replied: 0 },
};

const EMPTY_SOCIAL = {
  last7Days: { dmsSent: 0, dmReplies: 0, follows: 0 },
  last30Days: { dmsSent: 0, dmReplies: 0, follows: 0 },
};

const EMPTY_FOLLOW_UPS = { dueToday: [], overdue: [] };

// --- Pipeline Funnel ---

test("formatPipelineFunnel includes header and all statuses", () => {
  const { formatPipelineFunnel } = loadFormatter();
  const out = formatPipelineFunnel(EMPTY_PIPELINE);
  assert.ok(out.includes("PIPELINE FUNNEL"));
  assert.ok(out.includes("New Lead"));
  assert.ok(out.includes("Enriched"));
  assert.ok(out.includes("Outreach Started"));
  assert.ok(out.includes("Replied"));
  assert.ok(out.includes("Meeting Booked"));
  assert.ok(out.includes("Onboarded"));
  assert.ok(out.includes("No Email"));
  assert.ok(out.includes("Bounced"));
  assert.ok(out.includes("TOTAL"));
});

test("formatPipelineFunnel computes correct total", () => {
  const { formatPipelineFunnel } = loadFormatter();
  const pipeline = { ...EMPTY_PIPELINE, new_lead: 10, enriched: 5, onboarded: 2 };
  const out = formatPipelineFunnel(pipeline);
  assert.ok(out.includes("17"), `Expected total 17 in output: ${out}`);
});

test("formatPipelineFunnel shows individual counts", () => {
  const { formatPipelineFunnel } = loadFormatter();
  const pipeline = { ...EMPTY_PIPELINE, replied: 42, bounced: 3 };
  const out = formatPipelineFunnel(pipeline);
  assert.ok(out.includes("42"));
  assert.ok(out.includes("3"));
});

// --- Email Stats ---

test("formatEmailStats includes header and all metrics", () => {
  const { formatEmailStats } = loadFormatter();
  const out = formatEmailStats(EMPTY_EMAIL);
  assert.ok(out.includes("EMAIL STATS"));
  assert.ok(out.includes("Sent"));
  assert.ok(out.includes("Opened"));
  assert.ok(out.includes("Clicked"));
  assert.ok(out.includes("Replied"));
  assert.ok(out.includes("7d"));
  assert.ok(out.includes("30d"));
});

test("formatEmailStats shows correct values", () => {
  const { formatEmailStats } = loadFormatter();
  const email = {
    last7Days: { sent: 15, opened: 10, clicked: 3, replied: 2 },
    last30Days: { sent: 60, opened: 40, clicked: 12, replied: 8 },
  };
  const out = formatEmailStats(email);
  assert.ok(out.includes("15"));
  assert.ok(out.includes("60"));
  assert.ok(out.includes("10"));
  assert.ok(out.includes("40"));
});

// --- Social Stats ---

test("formatSocialStats includes header and all metrics", () => {
  const { formatSocialStats } = loadFormatter();
  const out = formatSocialStats(EMPTY_SOCIAL);
  assert.ok(out.includes("SOCIAL STATS"));
  assert.ok(out.includes("DMs Sent"));
  assert.ok(out.includes("DM Replies"));
  assert.ok(out.includes("Follows"));
  assert.ok(out.includes("7d"));
  assert.ok(out.includes("30d"));
});

test("formatSocialStats shows correct values", () => {
  const { formatSocialStats } = loadFormatter();
  const social = {
    last7Days: { dmsSent: 5, dmReplies: 2, follows: 8 },
    last30Days: { dmsSent: 20, dmReplies: 7, follows: 30 },
  };
  const out = formatSocialStats(social);
  assert.ok(out.includes("20"));
  assert.ok(out.includes("30"));
});

// --- Active Campaigns ---

test("formatActiveCampaigns shows (none) when empty", () => {
  const { formatActiveCampaigns } = loadFormatter();
  const out = formatActiveCampaigns([]);
  assert.ok(out.includes("ACTIVE CAMPAIGNS"));
  assert.ok(out.includes("(none)"));
});

test("formatActiveCampaigns lists campaigns with stats", () => {
  const { formatActiveCampaigns } = loadFormatter();
  const campaigns = [
    {
      _id: "1",
      name: "Niagara Outreach",
      status: "active",
      leadCount: 25,
      stats: { sent: 50, openRate: 0.4, replyRate: 0.08 },
    },
  ];
  const out = formatActiveCampaigns(campaigns);
  assert.ok(out.includes("Niagara Outreach"));
  assert.ok(out.includes("active"));
  assert.ok(out.includes("25"));
  assert.ok(out.includes("50"));
  assert.ok(out.includes("40.0%"));
  assert.ok(out.includes("8.0%"));
});

test("formatActiveCampaigns truncates long names", () => {
  const { formatActiveCampaigns } = loadFormatter();
  const campaigns = [
    {
      _id: "1",
      name: "This Is A Very Long Campaign Name That Exceeds Limit",
      status: "paused",
      leadCount: 10,
      stats: { sent: 0, openRate: 0, replyRate: 0 },
    },
  ];
  const out = formatActiveCampaigns(campaigns);
  // Name is truncated to 24 chars
  assert.ok(out.includes("This Is A Very Long Camp"));
  assert.ok(!out.includes("Exceeds Limit"));
});

// --- Follow-Ups Due ---

test("formatFollowUpsDue shows counts", () => {
  const { formatFollowUpsDue } = loadFormatter();
  const out = formatFollowUpsDue(EMPTY_FOLLOW_UPS);
  assert.ok(out.includes("FOLLOW-UPS DUE"));
  assert.ok(out.includes("Overdue:   0"));
  assert.ok(out.includes("Due Today: 0"));
});

test("formatFollowUpsDue lists overdue and due-today leads", () => {
  const { formatFollowUpsDue } = loadFormatter();
  const followUps = {
    overdue: [
      { _id: "a", name: "Berry Farm", city: "Guelph", type: "farm", nextFollowUpAt: 1000 },
    ],
    dueToday: [
      { _id: "b", name: "Apple Orchard", city: "Niagara", type: "farm", nextFollowUpAt: 2000 },
    ],
  };
  const out = formatFollowUpsDue(followUps);
  assert.ok(out.includes("Overdue:   1"));
  assert.ok(out.includes("Due Today: 1"));
  assert.ok(out.includes("Berry Farm (Guelph)"));
  assert.ok(out.includes("Apple Orchard (Niagara)"));
});

// --- Full Report ---

test("formatOutreachReport includes all sections", () => {
  const { formatOutreachReport } = loadFormatter();
  const report = formatOutreachReport({
    pipeline: EMPTY_PIPELINE,
    email: EMPTY_EMAIL,
    social: EMPTY_SOCIAL,
    campaigns: [],
    followUps: EMPTY_FOLLOW_UPS,
  });
  assert.ok(report.includes("PIPELINE FUNNEL"));
  assert.ok(report.includes("EMAIL STATS"));
  assert.ok(report.includes("SOCIAL STATS"));
  assert.ok(report.includes("ACTIVE CAMPAIGNS"));
  assert.ok(report.includes("FOLLOW-UPS DUE"));
});

test("formatOutreachReport with populated data renders correctly", () => {
  const { formatOutreachReport } = loadFormatter();
  const report = formatOutreachReport({
    pipeline: { ...EMPTY_PIPELINE, new_lead: 50, enriched: 30, outreach_started: 15, replied: 5 },
    email: {
      last7Days: { sent: 10, opened: 7, clicked: 2, replied: 1 },
      last30Days: { sent: 45, opened: 30, clicked: 10, replied: 4 },
    },
    social: {
      last7Days: { dmsSent: 3, dmReplies: 1, follows: 5 },
      last30Days: { dmsSent: 12, dmReplies: 4, follows: 20 },
    },
    campaigns: [
      {
        _id: "c1",
        name: "Spring Campaign",
        status: "active",
        leadCount: 100,
        stats: { sent: 200, openRate: 0.35, replyRate: 0.05 },
      },
    ],
    followUps: {
      overdue: [{ _id: "f1", name: "Test Farm", city: "Toronto", type: "farm", nextFollowUpAt: 1000 }],
      dueToday: [],
    },
  });
  // Pipeline numbers
  assert.ok(report.includes("50"));
  assert.ok(report.includes("100"), "Expected 100 in output");
  // Campaign
  assert.ok(report.includes("Spring Campaign"));
  assert.ok(report.includes("35.0%"));
  // Follow-up
  assert.ok(report.includes("Test Farm (Toronto)"));
});
