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
// Google Places enrichment finds the business and fills placeId,
// phone if available
// =============================================================

// --- fetchPlaceDetails action ---

test("fetchPlaceDetails action is exported from googlePlaces", () => {
  assert.match(placesSource, /export\s+const\s+fetchPlaceDetails\s*=\s*action\(/);
});

test("fetchPlaceDetails accepts a placeId argument", () => {
  const actionBlock = placesSource.slice(
    placesSource.indexOf("fetchPlaceDetails"),
    placesSource.indexOf("enrichFromGooglePlaces"),
  );
  assert.match(actionBlock, /placeId:\s*v\.string\(\)/);
});

test("fetchPlaceDetails requires GOOGLE_PLACES_API_KEY", () => {
  const actionBlock = placesSource.slice(
    placesSource.indexOf("fetchPlaceDetails"),
    placesSource.indexOf("enrichFromGooglePlaces"),
  );
  assert.match(actionBlock, /process\.env\.GOOGLE_PLACES_API_KEY/);
  assert.match(actionBlock, /Missing\s+GOOGLE_PLACES_API_KEY/);
});

test("fetchPlaceDetails calls placeDetails helper and returns result", () => {
  const actionBlock = placesSource.slice(
    placesSource.indexOf("fetchPlaceDetails"),
    placesSource.indexOf("enrichFromGooglePlaces"),
  );
  assert.match(actionBlock, /return\s+placeDetails\(args\.placeId,\s*apiKey\)/);
});

test("fetchPlaceDetails returns GooglePlacesResult (not nullable)", () => {
  const actionBlock = placesSource.slice(
    placesSource.indexOf("fetchPlaceDetails"),
    placesSource.indexOf("enrichFromGooglePlaces"),
  );
  assert.match(actionBlock, /Promise<GooglePlacesResult>/);
  // Should NOT be nullable — we already have a valid placeId
  assert.doesNotMatch(actionBlock, /Promise<GooglePlacesResult\s*\|\s*null>/);
});

// --- Orchestrator: search when no placeId ---

test("orchestrator searches Google Places when lead has no placeId", () => {
  assert.match(orchestratorSource, /if\s*\(!lead\.placeId\)/);
  assert.match(orchestratorSource, /enrichFromGooglePlaces/);
});

test("orchestrator fills placeId from Google Places search result", () => {
  assert.match(orchestratorSource, /patch\.placeId\s*=\s*placesResult\.placeId/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("placeId"\)/);
});

// --- Orchestrator: fetch details when placeId exists but phone/website missing ---

test("orchestrator fetches Place Details when lead has placeId but no phone", () => {
  assert.match(orchestratorSource, /!lead\.contactPhone/);
  assert.match(orchestratorSource, /fetchPlaceDetails/);
  assert.match(orchestratorSource, /placeId:\s*lead\.placeId/);
});

test("orchestrator fetches Place Details when lead has placeId but no website", () => {
  assert.match(orchestratorSource, /!lead\.website/);
  assert.match(orchestratorSource, /fetchPlaceDetails/);
});

test("orchestrator fetches Place Details when overwrite is true even if phone exists", () => {
  const step3Block = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3: Google Places"),
    orchestratorSource.indexOf("// Step 4:"),
  );
  assert.match(step3Block, /\|\|\s*overwrite/);
  assert.match(step3Block, /fetchPlaceDetails/);
});

// --- Orchestrator: phone is filled from Places result ---

test("orchestrator fills contactPhone from Google Places result", () => {
  assert.match(orchestratorSource, /patch\.contactPhone\s*=\s*placesResult\.phone/);
  assert.match(orchestratorSource, /fieldsUpdated\.push\("contactPhone"\)/);
});

test("contactPhone is only filled when empty or forced", () => {
  assert.match(orchestratorSource, /!lead\.contactPhone\s*\|\|\s*overwrite.*placesResult\.phone/s);
});

// --- Orchestrator: error handling for fetchPlaceDetails ---

test("orchestrator catches and continues on Place Details fetch failure", () => {
  const step3Block = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 3: Google Places"),
    orchestratorSource.indexOf("// Step 4:"),
  );
  // Should have two try-catch blocks: one for search, one for details
  const tryCatches = step3Block.match(/try\s*\{/g);
  assert.ok(tryCatches && tryCatches.length >= 2, "should have try-catch for both search and details fetch");
});

// --- Google Places result includes phone in details request ---

test("Google Places details request includes formatted_phone_number field", () => {
  assert.match(placesSource, /formatted_phone_number/);
  assert.match(placesSource, /fields=/);
});

test("Google Places result maps formatted_phone_number to phone", () => {
  assert.match(placesSource, /phone:\s*r\.formatted_phone_number\s*\?\?\s*null/);
});

// --- Sources tracking ---

test("orchestrator adds google_places to sources when Places result is available", () => {
  assert.match(orchestratorSource, /source:\s*"google_places"/);
  assert.match(orchestratorSource, /detail:\s*placesResult\.placeId/);
});
