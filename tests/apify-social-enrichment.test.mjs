import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/apifySocial.ts", "utf8");

// --- Type tests ---

test("exports ApifySocialResult type", () => {
  assert.match(source, /export\s+type\s+ApifySocialResult\s*=/);
});

test("ApifySocialResult has email field (string | null)", () => {
  assert.match(source, /email:\s*string\s*\|\s*null/);
});

test("ApifySocialResult has phone field (string | null)", () => {
  assert.match(source, /phone:\s*string\s*\|\s*null/);
});

test("ApifySocialResult has website field (string | null)", () => {
  assert.match(source, /website:\s*string\s*\|\s*null/);
});

// --- Action export tests ---

test("exports scrapeSocialPages as a Convex action", () => {
  assert.match(source, /export\s+const\s+scrapeSocialPages\s*=\s*action\(/);
});

test("action args include optional facebookUrl", () => {
  assert.match(source, /facebookUrl:\s*v\.optional\(v\.string\(\)\)/);
});

test("action args include optional instagramUsername", () => {
  assert.match(source, /instagramUsername:\s*v\.optional\(v\.string\(\)\)/);
});

// --- API token guard ---

test("reads APIFY_API_TOKEN from process.env", () => {
  assert.match(source, /process\.env\.APIFY_API_TOKEN/);
});

test("returns null when API token is missing", () => {
  // Pattern: check for apiToken then return null
  assert.match(source, /if\s*\(\s*!apiToken\s*\)\s*\{[\s\S]*?return\s+null/);
});

// --- No-args guard ---

test("returns null when neither facebookUrl nor instagramUsername provided", () => {
  assert.match(
    source,
    /if\s*\(\s*!args\.facebookUrl\s*&&\s*!args\.instagramUsername\s*\)/,
  );
});

// --- Result initialization ---

test("initializes result with null email, phone, website", () => {
  assert.match(source, /email:\s*null/);
  assert.match(source, /phone:\s*null/);
  assert.match(source, /website:\s*null/);
});

// --- Facebook integration ---

test("uses correct Facebook Apify actor URL", () => {
  assert.match(
    source,
    /apify~facebook-page-contact-information\/run-sync-get-dataset-items/,
  );
});

test("sends pageUrls array in Facebook request body", () => {
  assert.match(source, /pageUrls:\s*\[args\.facebookUrl\]/);
});

// --- Instagram integration ---

test("uses correct Instagram Apify actor URL", () => {
  assert.match(
    source,
    /apify~instagram-profile-scraper\/run-sync-get-dataset-items/,
  );
});

test("sends usernames array in Instagram request body", () => {
  assert.match(source, /usernames:\s*\[args\.instagramUsername\]/);
});

test("Instagram scrape is conditional on missing email", () => {
  assert.match(source, /args\.instagramUsername\s*&&\s*!result\.email/);
});

// --- Error isolation ---

test("Facebook call is wrapped in try/catch", () => {
  // The Facebook block should have its own try/catch
  const fbBlock = source.match(
    /\/\/\s*Facebook[\s\S]*?try\s*\{[\s\S]*?facebookUrl[\s\S]*?catch/,
  );
  assert.ok(fbBlock, "Facebook block should be wrapped in try/catch");
});

test("Instagram call is wrapped in try/catch", () => {
  const igBlock = source.match(
    /\/\/\s*Instagram[\s\S]*?try\s*\{[\s\S]*?instagramUsername[\s\S]*?catch/,
  );
  assert.ok(igBlock, "Instagram block should be wrapped in try/catch");
});

// --- Timeout ---

test("uses AbortController for timeout", () => {
  assert.match(source, /new\s+AbortController\(\)/);
});

test("uses 30-second timeout", () => {
  assert.match(source, /30[_]?000/);
});

test("passes signal to fetch calls", () => {
  assert.match(source, /signal:\s*controller\.signal/);
});

// --- Return type ---

test("handler return type is ApifySocialResult | null", () => {
  assert.match(source, /Promise<ApifySocialResult\s*\|\s*null>/);
});

// --- Defensive parsing functions ---

test("has parseFacebookItem function for defensive response parsing", () => {
  assert.match(source, /function\s+parseFacebookItem\(data:\s*unknown\)/);
});

test("parseFacebookItem validates data is an array", () => {
  assert.match(source, /!Array\.isArray\(data\)\s*\|\|\s*data\.length\s*===\s*0/);
});

test("parseFacebookItem checks first item is an object", () => {
  assert.match(source, /typeof\s+item\s*!==\s*"object"\s*\|\|\s*item\s*===\s*null/);
});

test("parseFacebookItem validates field types with typeof checks", () => {
  assert.match(source, /typeof\s+obj\.email\s*===\s*"string"/);
  assert.match(source, /typeof\s+obj\.phone\s*===\s*"string"/);
  assert.match(source, /typeof\s+obj\.website\s*===\s*"string"/);
});

test("has parseInstagramItem function for defensive response parsing", () => {
  assert.match(source, /function\s+parseInstagramItem\(data:\s*unknown\)/);
});

test("parseInstagramItem validates data is an array", () => {
  // Both parseFacebookItem and parseInstagramItem share this pattern
  const matches = source.match(/!Array\.isArray\(data\)/g);
  assert.ok(matches && matches.length >= 2, "both parsers validate array");
});

test("parseInstagramItem validates externalUrl field type", () => {
  assert.match(source, /typeof\s+obj\.externalUrl\s*===\s*"string"/);
});

test("Facebook handler uses parseFacebookItem for response parsing", () => {
  assert.match(source, /parseFacebookItem\(data\)/);
});

test("Instagram handler uses parseInstagramItem for response parsing", () => {
  assert.match(source, /parseInstagramItem\(data\)/);
});
