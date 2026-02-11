import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

test("defines all required tables", () => {
  for (const tableName of [
    "leads",
    "clusters",
    "emails",
    "activities",
    "emailTemplates",
    "settings",
    "campaigns",
  ]) {
    assert.match(schemaSource, new RegExp(`\\b${tableName}:\\s*defineTable\\(`));
  }
});

test("defines required leads indexes", () => {
  assert.match(schemaSource, /\.index\("by_status",\s*\["status"\]\)/);
  assert.match(schemaSource, /\.index\("by_clusterId",\s*\["clusterId"\]\)/);
  assert.match(schemaSource, /\.index\("by_city",\s*\["city"\]\)/);
  assert.match(schemaSource, /\.index\("by_name",\s*\["name"\]\)/);
});

test("defines required activities indexes", () => {
  assert.match(schemaSource, /activities:[\s\S]*?\.index\("by_leadId",\s*\["leadId"\]\)/);
});

test("defines required emails indexes", () => {
  assert.match(schemaSource, /emails:[\s\S]*?\.index\("by_leadId",\s*\["leadId"\]\)/);
  assert.match(
    schemaSource,
    /emails:[\s\S]*?\.index\("by_smartleadCampaignId",\s*\["smartleadCampaignId"\]\)/,
  );
});

test("defines required settings indexes", () => {
  assert.match(schemaSource, /settings:[\s\S]*?\.index\("by_key",\s*\["key"\]\)/);
});

test("defines required campaigns indexes", () => {
  assert.match(schemaSource, /campaigns:[\s\S]*?\.index\("by_status",\s*\["status"\]\)/);
});

test("clusters table has boundary field with lat/lng array", () => {
  assert.match(
    schemaSource,
    /clusters:[\s\S]*?boundary:\s*v\.array\(v\.object\(\{\s*lat:\s*v\.number\(\),\s*lng:\s*v\.number\(\)\s*\}\)\)/,
  );
});
