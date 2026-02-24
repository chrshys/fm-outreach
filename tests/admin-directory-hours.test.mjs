import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "../fruitland-market/packages/backend/convex/adminDirectory.ts",
  "utf8",
);

test("csvRowValidator includes optional hours array field", () => {
  assert.match(source, /hours:\s*v\.optional\(/);
  assert.match(source, /v\.array\(\s*v\.object\(/);
});

test("hours object has day (number), open (string), close (string), isClosed (boolean)", () => {
  assert.match(source, /day:\s*v\.number\(\)/);
  assert.match(source, /open:\s*v\.string\(\)/);
  assert.match(source, /close:\s*v\.string\(\)/);
  assert.match(source, /isClosed:\s*v\.boolean\(\)/);
});

test("hours field appears after categories in csvRowValidator", () => {
  const categoriesIdx = source.indexOf("categories: v.optional(v.array(v.string()))");
  const hoursIdx = source.indexOf("hours: v.optional(");
  assert.ok(categoriesIdx > -1, "categories field should exist in csvRowValidator");
  assert.ok(hoursIdx > -1, "hours field should exist in csvRowValidator");
  assert.ok(hoursIdx > categoriesIdx, "hours should appear after categories");
});
