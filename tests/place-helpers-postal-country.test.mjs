import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const helperSource = fs.readFileSync(
  "convex/discovery/placeHelpers.ts",
  "utf8",
);

const helpers = await import("../convex/discovery/placeHelpers.ts");
const { extractPostalCode, extractCountryCode } = helpers;

// ============================================================
// 1. Structural tests — exports exist
// ============================================================

test("placeHelpers exports extractPostalCode function", () => {
  assert.match(helperSource, /export\s+function\s+extractPostalCode\(/);
});

test("placeHelpers exports extractCountryCode function", () => {
  assert.match(helperSource, /export\s+function\s+extractCountryCode\(/);
});

test("placeHelpers exports AddressComponent type", () => {
  assert.match(helperSource, /export\s+type\s+AddressComponent\s*=/);
});

test("PlaceTextResult includes address_components field", () => {
  assert.match(helperSource, /address_components\?:\s*AddressComponent\[\]/);
});

test("DiscoveredLead includes postalCode field", () => {
  assert.match(helperSource, /postalCode:\s*string/);
});

test("DiscoveredLead includes countryCode field", () => {
  assert.match(helperSource, /countryCode:\s*string/);
});

test("discoveredLeadValidator includes postalCode", () => {
  assert.match(helperSource, /postalCode:\s*v\.string\(\)/);
});

test("discoveredLeadValidator includes countryCode", () => {
  assert.match(helperSource, /countryCode:\s*v\.string\(\)/);
});

// ============================================================
// 2. extractPostalCode behavioral tests
// ============================================================

test("extractPostalCode returns postal code from address_components", () => {
  const components = [
    { long_name: "123", short_name: "123", types: ["street_number"] },
    { long_name: "L0S 1J0", short_name: "L0S 1J0", types: ["postal_code"] },
    { long_name: "Canada", short_name: "CA", types: ["country", "political"] },
  ];
  assert.equal(extractPostalCode(components), "L0S 1J0");
});

test("extractPostalCode returns empty string when no postal_code component", () => {
  const components = [
    { long_name: "123", short_name: "123", types: ["street_number"] },
    { long_name: "Canada", short_name: "CA", types: ["country", "political"] },
  ];
  assert.equal(extractPostalCode(components), "");
});

test("extractPostalCode returns empty string for undefined input", () => {
  assert.equal(extractPostalCode(undefined), "");
});

test("extractPostalCode returns empty string for empty array", () => {
  assert.equal(extractPostalCode([]), "");
});

test("extractPostalCode uses short_name", () => {
  const components = [
    { long_name: "90210", short_name: "90210", types: ["postal_code"] },
  ];
  assert.equal(extractPostalCode(components), "90210");
});

// ============================================================
// 3. extractCountryCode behavioral tests
// ============================================================

test("extractCountryCode returns country short_name from address_components", () => {
  const components = [
    { long_name: "123", short_name: "123", types: ["street_number"] },
    { long_name: "Canada", short_name: "CA", types: ["country", "political"] },
  ];
  assert.equal(extractCountryCode(components), "CA");
});

test("extractCountryCode returns US for United States", () => {
  const components = [
    { long_name: "United States", short_name: "US", types: ["country", "political"] },
  ];
  assert.equal(extractCountryCode(components), "US");
});

test("extractCountryCode returns empty string when no country component", () => {
  const components = [
    { long_name: "123", short_name: "123", types: ["street_number"] },
    { long_name: "L0S 1J0", short_name: "L0S 1J0", types: ["postal_code"] },
  ];
  assert.equal(extractCountryCode(components), "");
});

test("extractCountryCode returns empty string for undefined input", () => {
  assert.equal(extractCountryCode(undefined), "");
});

test("extractCountryCode returns empty string for empty array", () => {
  assert.equal(extractCountryCode([]), "");
});

// ============================================================
// 4. Integration — discoverLeads and discoverCell use new helpers
// ============================================================

test("discoverLeads imports extractPostalCode and extractCountryCode", () => {
  const actionSource = fs.readFileSync(
    "convex/discovery/discoverLeads.ts",
    "utf8",
  );
  assert.ok(
    actionSource.includes("extractPostalCode"),
    "discoverLeads must import extractPostalCode",
  );
  assert.ok(
    actionSource.includes("extractCountryCode"),
    "discoverLeads must import extractCountryCode",
  );
});

test("discoverCell imports extractPostalCode and extractCountryCode", () => {
  const cellSource = fs.readFileSync(
    "convex/discovery/discoverCell.ts",
    "utf8",
  );
  assert.ok(
    cellSource.includes("extractPostalCode"),
    "discoverCell must import extractPostalCode",
  );
  assert.ok(
    cellSource.includes("extractCountryCode"),
    "discoverCell must import extractCountryCode",
  );
});

test("discoverLeads maps postalCode and countryCode in lead construction", () => {
  const actionSource = fs.readFileSync(
    "convex/discovery/discoverLeads.ts",
    "utf8",
  );
  assert.ok(
    actionSource.includes("postalCode:"),
    "discoverLeads must set postalCode on leads",
  );
  assert.ok(
    actionSource.includes("countryCode:"),
    "discoverLeads must set countryCode on leads",
  );
});

test("discoverCell maps postalCode and countryCode in lead construction", () => {
  const cellSource = fs.readFileSync(
    "convex/discovery/discoverCell.ts",
    "utf8",
  );
  assert.ok(
    cellSource.includes("postalCode:"),
    "discoverCell must set postalCode on leads",
  );
  assert.ok(
    cellSource.includes("countryCode:"),
    "discoverCell must set countryCode on leads",
  );
});
