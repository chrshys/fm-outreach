import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cronSource = fs.readFileSync(
  "convex/smartlead/analyticsCron.ts",
  "utf8",
);
const cronsSource = fs.readFileSync("convex/crons.ts", "utf8");

// --- analyticsCron.ts module structure ---

test("imports internalAction and internalMutation from generated server", () => {
  assert.match(
    cronSource,
    /import\s*\{[^}]*internalAction[^}]*\}\s*from\s*["']\.\.\/\_generated\/server["']/,
  );
  assert.match(
    cronSource,
    /import\s*\{[^}]*internalMutation[^}]*\}\s*from\s*["']\.\.\/\_generated\/server["']/,
  );
});

test("imports internal from generated api", () => {
  assert.match(
    cronSource,
    /import\s*\{[^}]*internal[^}]*\}\s*from\s*["']\.\.\/\_generated\/api["']/,
  );
});

test("imports getCampaignAnalytics from client", () => {
  assert.match(
    cronSource,
    /import\s*\{[^}]*getCampaignAnalytics[^}]*\}\s*from\s*["']\.\/client["']/,
  );
});

// --- getActiveCampaigns ---

test("exports getActiveCampaigns as internalMutation", () => {
  assert.match(
    cronSource,
    /export\s+const\s+getActiveCampaigns\s*=\s*internalMutation/,
  );
});

test("getActiveCampaigns queries campaigns by active status", () => {
  assert.match(cronSource, /\.query\(\s*["']campaigns["']\s*\)/);
  assert.match(cronSource, /\.withIndex\(\s*["']by_status["']/);
  assert.match(cronSource, /\.eq\(\s*["']status["']\s*,\s*["']active["']\s*\)/);
});

test("getActiveCampaigns filters for campaigns with smartleadCampaignId", () => {
  assert.match(cronSource, /\.filter\(\s*\(?c\)?\s*=>\s*c\.smartleadCampaignId/);
});

test("getActiveCampaigns returns _id and smartleadCampaignId", () => {
  assert.match(cronSource, /_id:\s*c\._id/);
  assert.match(cronSource, /smartleadCampaignId:\s*c\.smartleadCampaignId/);
});

// --- updateCampaignStats ---

test("exports updateCampaignStats as internalMutation", () => {
  assert.match(
    cronSource,
    /export\s+const\s+updateCampaignStats\s*=\s*internalMutation/,
  );
});

test("updateCampaignStats accepts campaignId and stats args", () => {
  assert.match(cronSource, /campaignId:\s*v\.id\(\s*["']campaigns["']\s*\)/);
  assert.match(cronSource, /stats:\s*v\.object\(/);
});

test("updateCampaignStats validates all stat fields", () => {
  assert.match(cronSource, /sent:\s*v\.number\(\)/);
  assert.match(cronSource, /opened:\s*v\.number\(\)/);
  assert.match(cronSource, /clicked:\s*v\.number\(\)/);
  assert.match(cronSource, /replied:\s*v\.number\(\)/);
  assert.match(cronSource, /bounced:\s*v\.number\(\)/);
});

test("updateCampaignStats patches campaign with stats and updatedAt", () => {
  assert.match(cronSource, /ctx\.db\.patch\(\s*args\.campaignId/);
  assert.match(cronSource, /stats:\s*args\.stats/);
  assert.match(cronSource, /updatedAt:\s*Date\.now\(\)/);
});

// --- syncAnalytics action ---

test("exports syncAnalytics as internalAction", () => {
  assert.match(
    cronSource,
    /export\s+const\s+syncAnalytics\s*=\s*internalAction/,
  );
});

test("syncAnalytics calls getActiveCampaigns mutation", () => {
  assert.match(
    cronSource,
    /ctx\.runMutation\(\s*internal\.smartlead\.analyticsCron\.getActiveCampaigns/,
  );
});

test("syncAnalytics calls getCampaignAnalytics for each campaign", () => {
  assert.match(cronSource, /getCampaignAnalytics\(/);
});

test("syncAnalytics calls updateCampaignStats with mapped analytics", () => {
  assert.match(
    cronSource,
    /ctx\.runMutation\(\s*internal\.smartlead\.analyticsCron\.updateCampaignStats/,
  );
});

test("syncAnalytics maps Smartlead fields to stats object", () => {
  assert.match(cronSource, /sent:\s*analytics\.sent_count\s*\?\?\s*0/);
  assert.match(cronSource, /opened:\s*analytics\.open_count\s*\?\?\s*0/);
  assert.match(cronSource, /clicked:\s*analytics\.click_count\s*\?\?\s*0/);
  assert.match(cronSource, /replied:\s*analytics\.reply_count\s*\?\?\s*0/);
  assert.match(cronSource, /bounced:\s*analytics\.bounce_count\s*\?\?\s*0/);
});

test("syncAnalytics handles errors per campaign without stopping loop", () => {
  assert.match(cronSource, /try\s*\{/);
  assert.match(cronSource, /catch\s*\(\s*error\s*\)/);
  assert.match(cronSource, /console\.error\(/);
});

test("syncAnalytics returns early when no active campaigns", () => {
  assert.match(cronSource, /campaigns\.length\s*===\s*0/);
});

// --- crons.ts ---

test("crons.ts imports cronJobs from convex/server", () => {
  assert.match(
    cronsSource,
    /import\s*\{[^}]*cronJobs[^}]*\}\s*from\s*["']convex\/server["']/,
  );
});

test("crons.ts imports internal from generated api", () => {
  assert.match(
    cronsSource,
    /import\s*\{[^}]*internal[^}]*\}\s*from\s*["']\.\/\_generated\/api["']/,
  );
});

test("crons.ts schedules syncAnalytics every 6 hours", () => {
  assert.match(cronsSource, /crons\.interval\(/);
  assert.match(cronsSource, /hours:\s*6/);
  assert.match(
    cronsSource,
    /internal\.smartlead\.analyticsCron\.syncAnalytics/,
  );
});

test("crons.ts exports default crons", () => {
  assert.match(cronsSource, /export\s+default\s+crons/);
});
