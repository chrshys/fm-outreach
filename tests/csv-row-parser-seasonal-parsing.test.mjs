import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const parserPath =
  "../fruitland-market/apps/web/lib/csv-row-parser.ts";

const source = fs.readFileSync(parserPath, "utf8");

// Extract the parseRows function body
const parseRowsMatch = source.match(
  /export\s+function\s+parseRows[\s\S]*?\{([\s\S]*?)^}/m,
);
const parseRowsBody = parseRowsMatch ? parseRowsMatch[1] : "";

test("parseRows has an isSeasonal parsing branch", () => {
  assert.match(
    parseRowsBody,
    /else if \(field === "isSeasonal"\)/,
    'parseRows should have else if (field === "isSeasonal") branch',
  );
});

test("isSeasonal branch converts 'true' string to boolean true", () => {
  assert.match(
    parseRowsBody,
    /if \(lower === "true"\) row\[field\] = true/,
    'isSeasonal branch should assign true when value is "true"',
  );
});

test("isSeasonal branch converts 'false' string to boolean false", () => {
  assert.match(
    parseRowsBody,
    /else if \(lower === "false"\) row\[field\] = false/,
    'isSeasonal branch should assign false when value is "false"',
  );
});

test("seasonalNote has no dedicated parsing branch (falls through to default string assignment)", () => {
  assert.doesNotMatch(
    parseRowsBody,
    /field === "seasonalNote"/,
    "seasonalNote should not have its own parsing branch — it falls through to the default string assignment",
  );
});
