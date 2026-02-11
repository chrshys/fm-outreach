import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8");

// ============================================================
// requestDiscoverCell: public mutation for dashboard invocation
// ============================================================

test("requestDiscoverCell is a public mutation", () => {
  assert.match(source, /export\s+const\s+requestDiscoverCell\s*=\s*mutation\(/);
});

test("requestDiscoverCell accepts cellId arg of type v.id('discoveryCells')", () => {
  // The mutation's args block contains cellId with discoveryCells
  const mutationBlock = source.slice(source.indexOf("requestDiscoverCell"));
  assert.match(mutationBlock, /cellId:\s*v\.id\("discoveryCells"\)/);
});

test("requestDiscoverCell fetches cell and validates it exists", () => {
  const mutationBlock = source.slice(source.indexOf("requestDiscoverCell"));
  assert.match(mutationBlock, /ctx\.db\.get\(args\.cellId\)/);
  assert.match(mutationBlock, /Cell not found/);
});

test("requestDiscoverCell rejects cells not in unsearched or searched status", () => {
  const mutationBlock = source.slice(source.indexOf("requestDiscoverCell"));
  assert.match(mutationBlock, /status\s*!==\s*"unsearched"/);
  assert.match(mutationBlock, /status\s*!==\s*"searched"/);
});

test("requestDiscoverCell schedules discoverCell internal action", () => {
  const mutationBlock = source.slice(source.indexOf("requestDiscoverCell"));
  assert.match(mutationBlock, /ctx\.scheduler\.runAfter/);
  assert.match(mutationBlock, /internal\.discovery\.discoverCell\.discoverCell/);
});

test("requestDiscoverCell passes cellId to the scheduled action", () => {
  const mutationBlock = source.slice(source.indexOf("requestDiscoverCell"));
  assert.match(mutationBlock, /cellId:\s*args\.cellId/);
});
