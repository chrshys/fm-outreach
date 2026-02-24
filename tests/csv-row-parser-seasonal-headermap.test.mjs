import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const parserPath =
  "../fruitland-market/apps/web/lib/csv-row-parser.ts";

const source = fs.readFileSync(parserPath, "utf8");

// Extract the headerMap object block
const headerMapMatch = source.match(
  /export\s+const\s+headerMap[\s\S]*?\{([\s\S]*?)\};/,
);
const headerMapBody = headerMapMatch ? headerMapMatch[1] : "";

test("headerMap contains isseasonal mapping to isSeasonal", () => {
  assert.match(
    headerMapBody,
    /isseasonal:\s*"isSeasonal"/,
    'headerMap should have isseasonal: "isSeasonal"',
  );
});

test("headerMap contains seasonalnote mapping to seasonalNote", () => {
  assert.match(
    headerMapBody,
    /seasonalnote:\s*"seasonalNote"/,
    'headerMap should have seasonalnote: "seasonalNote"',
  );
});
