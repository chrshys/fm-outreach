import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/leads.ts", "utf8");

test("exports leads get query with lead id argument", () => {
  assert.match(source, /export\s+const\s+get\s*=\s*query\(/);
  assert.match(source, /leadId:\s*v\.id\("leads"\)/);
});

test("leads get query returns the full lead document from db.get", () => {
  assert.match(source, /return\s+ctx\.db\.get\(args\.leadId\);/);
});
