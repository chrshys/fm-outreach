import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

test("exports getCellLeadIdsForEnrichment as an internalQuery", () => {
  assert.match(
    source,
    /export\s+const\s+getCellLeadIdsForEnrichment\s*=\s*internalQuery\(/,
  );
});

test("accepts cellId arg of type v.id('discoveryCells')", () => {
  assert.match(source, /cellId:\s*v\.id\("discoveryCells"\)/);
});

test("queries leads using by_discoveryCellId index", () => {
  // Verify it uses the correct index to look up leads by cell
  const fnStart = source.indexOf("getCellLeadIdsForEnrichment");
  const fnBlock = source.slice(fnStart, fnStart + 600);
  assert.match(
    fnBlock,
    /withIndex\("by_discoveryCellId"/,
  );
});

test("filters leads where enrichedAt is undefined or older than 30 days", () => {
  const fnStart = source.indexOf("getCellLeadIdsForEnrichment");
  const fnBlock = source.slice(fnStart, fnStart + 800);
  // Check for the 30-day constant
  assert.match(fnBlock, /30\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  // Check for enrichedAt === undefined check
  assert.match(fnBlock, /lead\.enrichedAt\s*===\s*undefined/);
});

test("returns an array of lead _id values", () => {
  const fnStart = source.indexOf("getCellLeadIdsForEnrichment");
  const fnBlock = source.slice(fnStart, fnStart + 800);
  assert.match(fnBlock, /\.map\(\s*\(?lead\)?\s*=>\s*lead\._id\s*\)/);
});
