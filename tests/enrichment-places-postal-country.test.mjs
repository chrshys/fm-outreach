import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const placesSource = fs.readFileSync(
  "convex/enrichment/googlePlaces.ts",
  "utf8",
);

const orchestratorSource = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);

// =============================================================
// Google Places enrichment extracts postalCode and countryCode
// from address_components and passes them through to the lead
// =============================================================

// --- GooglePlacesResult type includes postalCode and countryCode ---

test("GooglePlacesResult type includes postalCode field", () => {
  assert.match(placesSource, /postalCode:\s*string\s*\|\s*null/);
});

test("GooglePlacesResult type includes countryCode field", () => {
  assert.match(placesSource, /countryCode:\s*string\s*\|\s*null/);
});

// --- Place Details API requests address_components ---

test("Place Details API request includes address_components field", () => {
  assert.match(placesSource, /address_components/);
  const fieldsLine = placesSource.match(/const fields\s*=\s*\n?\s*"([^"]+)"/);
  assert.ok(fieldsLine, "should have a fields variable");
  assert.ok(
    fieldsLine[1].includes("address_components"),
    "fields should include address_components",
  );
});

// --- Extraction of postalCode from address_components ---

test("placeDetails extracts postal_code from address_components", () => {
  assert.match(placesSource, /postal_code/);
  assert.match(placesSource, /postalCode:/);
});

// --- Extraction of countryCode from address_components ---

test("placeDetails extracts country from address_components", () => {
  assert.match(placesSource, /\.types\.includes\("country"\)/);
  assert.match(placesSource, /countryCode:/);
});

// --- Return values use short_name with null fallback ---

test("postalCode uses short_name with null fallback", () => {
  assert.match(placesSource, /postalCodeComponent\?\.short_name\s*\?\?\s*null/);
});

test("countryCode uses short_name with null fallback", () => {
  assert.match(placesSource, /countryComponent\?\.short_name\s*\?\?\s*null/);
});

// --- Orchestrator patches postalCode from Google Places ---

test("orchestrator patches postalCode from Google Places result", () => {
  assert.match(orchestratorSource, /patch\.postalCode\s*=\s*placesResult\.postalCode/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("postalCode"\)/);
});

test("postalCode is only filled when empty or overwrite", () => {
  assert.match(
    orchestratorSource,
    /!lead\.postalCode\s*\|\|\s*overwrite.*placesResult\.postalCode/s,
  );
});

// --- Orchestrator patches countryCode from Google Places ---

test("orchestrator patches countryCode from Google Places result", () => {
  assert.match(orchestratorSource, /patch\.countryCode\s*=\s*placesResult\.countryCode/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("countryCode"\)/);
});

test("countryCode is only filled when empty or overwrite", () => {
  assert.match(
    orchestratorSource,
    /!lead\.countryCode\s*\|\|\s*overwrite.*placesResult\.countryCode/s,
  );
});

// --- postalCode and countryCode are in the Google Places patch section ---

test("postalCode and countryCode patches are in the Google Places section", () => {
  const placesSection = orchestratorSource.slice(
    orchestratorSource.indexOf("// From Google Places"),
    orchestratorSource.indexOf("// From Sonar"),
  );
  assert.match(placesSection, /patch\.postalCode/);
  assert.match(placesSection, /patch\.countryCode/);
});
