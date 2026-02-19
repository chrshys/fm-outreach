import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/leads.ts", "utf8");

test("exports bulkStampExported mutation with leadIds array arg", () => {
  assert.match(source, /export const bulkStampExported = mutation\(/);
  assert.match(source, /leadIds:\s*v\.array\(v\.id\("leads"\)\)/);
});

test("bulkStampExported patches each lead with exportedAt timestamp", () => {
  assert.match(
    source,
    /await ctx\.db\.patch\(leadId,\s*\{\s*exportedAt:\s*now,?\s*\}\)/s,
  );
});

test("bulkStampExported deduplicates leadIds", () => {
  assert.match(source, /const uniqueLeadIds = \[\.\.\.new Set\(args\.leadIds\)\]/);
});

test("bulkStampExported returns updatedCount", () => {
  assert.match(source, /updatedCount:\s*uniqueLeadIds\.length/);
});
