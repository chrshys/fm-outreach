import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

test("leads table has postalCode optional string field", () => {
  assert.match(
    schemaSource,
    /leads:[\s\S]*?postalCode:\s*v\.optional\(v\.string\(\)\)/,
  );
});

test("leads table has countryCode optional string field", () => {
  assert.match(
    schemaSource,
    /leads:[\s\S]*?countryCode:\s*v\.optional\(v\.string\(\)\)/,
  );
});

test("postalCode and countryCode are near placeId in location section", () => {
  const placeIdIdx = schemaSource.indexOf("placeId:");
  const postalCodeIdx = schemaSource.indexOf("postalCode:");
  const countryCodeIdx = schemaSource.indexOf("countryCode:");
  const contactNameIdx = schemaSource.indexOf("contactName:");

  assert.ok(placeIdIdx > -1, "placeId field exists");
  assert.ok(postalCodeIdx > -1, "postalCode field exists");
  assert.ok(countryCodeIdx > -1, "countryCode field exists");

  // postalCode and countryCode should come after placeId and before contactName
  assert.ok(postalCodeIdx > placeIdIdx, "postalCode comes after placeId");
  assert.ok(countryCodeIdx > placeIdIdx, "countryCode comes after placeId");
  assert.ok(postalCodeIdx < contactNameIdx, "postalCode comes before contactName");
  assert.ok(countryCodeIdx < contactNameIdx, "countryCode comes before contactName");
});
