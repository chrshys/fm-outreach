import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

test("leads table has hours optional array field", () => {
  assert.match(
    schemaSource,
    /leads:[\s\S]*?hours:\s*v\.optional\(\s*v\.array\(/,
  );
});

test("hours objects have day, open, close, and isClosed fields", () => {
  assert.match(schemaSource, /hours:[\s\S]*?day:\s*v\.number\(\)/);
  assert.match(schemaSource, /hours:[\s\S]*?open:\s*v\.string\(\)/);
  assert.match(schemaSource, /hours:[\s\S]*?close:\s*v\.string\(\)/);
  assert.match(schemaSource, /hours:[\s\S]*?isClosed:\s*v\.boolean\(\)/);
});

test("hours field comes after countryCode and before contactName", () => {
  const countryCodeIdx = schemaSource.indexOf("countryCode:");
  const hoursIdx = schemaSource.indexOf("hours:");
  const contactNameIdx = schemaSource.indexOf("contactName:");

  assert.ok(countryCodeIdx > -1, "countryCode field exists");
  assert.ok(hoursIdx > -1, "hours field exists");
  assert.ok(contactNameIdx > -1, "contactName field exists");

  assert.ok(hoursIdx > countryCodeIdx, "hours comes after countryCode");
  assert.ok(hoursIdx < contactNameIdx, "hours comes before contactName");
});
