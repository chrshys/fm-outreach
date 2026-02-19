import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const pageSource = fs.readFileSync("src/app/leads/page.tsx", "utf8");
const convexSource = fs.readFileSync("convex/leads.ts", "utf8");

test("listForExport includes _id in its map projection", () => {
  const exportMatch = convexSource.match(
    /export\s+const\s+listForExport\s*=\s*query\(\{[\s\S]*?\n\}\);/,
  );
  assert.ok(exportMatch, "listForExport query block should exist");
  const block = exportMatch[0];
  assert.match(block, /_id:\s*lead\._id/, "should project _id from lead");
});

test("handleExportCSV extracts IDs from export results", () => {
  assert.match(
    pageSource,
    /const exportedIds = results\.map\(\(r[^)]*\) => r\._id\)/,
    "should extract _id from each result into exportedIds",
  );
});

test("handleExportCSV calls bulkStampExported after successful download", () => {
  assert.match(
    pageSource,
    /bulkStampExported/,
    "should reference bulkStampExported mutation",
  );
  assert.match(
    pageSource,
    /convex\.mutation\(api\.leads\.bulkStampExported,\s*\{\s*leadIds:\s*exportedIds\s*\}\)/,
    "should call bulkStampExported with exportedIds",
  );
});

test("handleExportCSV only stamps when there are exported leads", () => {
  assert.match(
    pageSource,
    /if\s*\(exportedIds\.length\s*>\s*0\)/,
    "should guard bulkStampExported call with length check",
  );
});

test("bulkStampExported is called after toast.success", () => {
  const toastPos = pageSource.indexOf('toast.success(`Exported ${results.length} leads`)');
  const stampPos = pageSource.indexOf("bulkStampExported");
  assert.ok(toastPos !== -1, "should have toast.success call");
  assert.ok(stampPos !== -1, "should have bulkStampExported call");
  assert.ok(
    toastPos < stampPos,
    "bulkStampExported should be called after toast.success",
  );
});
