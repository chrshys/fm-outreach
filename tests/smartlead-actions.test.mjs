import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/smartlead/actions.ts", "utf8");

// --- createTestCampaign action ---

test("createTestCampaign is exported as a Convex action", () => {
  assert.match(source, /export\s+const\s+createTestCampaign\s*=\s*action\(/);
});

test("createTestCampaign accepts an optional name argument", () => {
  assert.match(source, /name:\s*v\.optional\(v\.string\(\)\)/);
});

test("createTestCampaign calls createCampaign from client", () => {
  assert.match(
    source,
    /import\s*\{[^}]*createCampaign[^}]*\}\s*from\s*["']\.\/client["']/,
  );
  assert.match(source, /await\s+createCampaign\(/);
});

test("createTestCampaign returns smartleadCampaignId and name", () => {
  assert.match(source, /smartleadCampaignId:\s*result\.id/);
  assert.match(source, /name:\s*result\.name/);
});

test("createTestCampaign generates a default name with timestamp when none provided", () => {
  assert.match(source, /FM Test Campaign/);
  assert.match(source, /new Date\(\)\.toISOString\(\)/);
});

test("createTestCampaign logs the created campaign details", () => {
  assert.match(source, /console\.log/);
  assert.match(source, /Created test campaign/);
});
