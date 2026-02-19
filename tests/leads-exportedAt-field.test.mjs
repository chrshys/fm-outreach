import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

test("leads table defines exportedAt as optional number", () => {
  assert.match(
    schemaSource,
    /leads:\s*defineTable\(\{[\s\S]*?exportedAt:\s*v\.optional\(v\.number\(\)\)/,
    "leads table should have exportedAt: v.optional(v.number())",
  );
});
