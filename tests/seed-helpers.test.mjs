import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/seedHelpers.ts", "utf8");

test("exports seed helper functions", () => {
  assert.match(source, /export\s+async\s+function\s+createTestLead\s*\(/);
  assert.match(source, /export\s+async\s+function\s+createTestActivity\s*\(/);
});

test("createTestLead inserts into leads with development-friendly defaults", () => {
  assert.match(source, /ctx\.db\.insert\("leads",\s*lead\)/);
  assert.match(source, /status:\s*"new_lead"/);
  assert.match(source, /source:\s*"manual"/);
  assert.match(source, /followUpCount:\s*0/);
  assert.match(source, /\.{3}defaultLead,\s*\.{3}overrides/);
});

test("createTestActivity inserts into activities and can auto-create a lead", () => {
  assert.match(source, /ctx\.db\.insert\("activities",\s*activity\)/);
  assert.match(source, /overrides\.leadId\s*\?\?\s*\(await\s+createTestLead\(ctx\)\)/);
  assert.match(source, /type:\s*"note_added"/);
  assert.match(source, /description:\s*"Seed test activity"/);
});
