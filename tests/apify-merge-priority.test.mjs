import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);

// Extract the merge block for targeted assertions
const mergeBlock = source.slice(
  source.indexOf("// Merge results"),
  source.indexOf("// Step 5: Set enrichment metadata"),
);

// --- Email priority: apifyWebsite > apifySocial > sonar ---

test("email merge checks apifyWebsiteResult.emails[0] first", () => {
  const emailBlock = mergeBlock.slice(
    mergeBlock.indexOf("// Email"),
    mergeBlock.indexOf("// From Sonar — contact name"),
  );
  assert.match(emailBlock, /apifyWebsiteResult\?\.emails\?\.\[0\]/);
  assert.match(emailBlock, /bestEmail\s*=\s*apifyWebsiteResult\.emails\[0\]/);
});

test("email merge checks apifySocialResult.email second", () => {
  const emailBlock = mergeBlock.slice(
    mergeBlock.indexOf("// Email"),
    mergeBlock.indexOf("// From Sonar — contact name"),
  );
  assert.match(emailBlock, /else if \(apifySocialResult\?\.email\)/);
  assert.match(emailBlock, /bestEmail\s*=\s*apifySocialResult\.email/);
});

test("email merge checks sonarResult.contactEmail last", () => {
  const emailBlock = mergeBlock.slice(
    mergeBlock.indexOf("// Email"),
    mergeBlock.indexOf("// From Sonar — contact name"),
  );
  assert.match(emailBlock, /else if \(sonarResult\?\.contactEmail\)/);
  assert.match(emailBlock, /bestEmail\s*=\s*sonarResult\.contactEmail/);
});

test("apifyWebsite email is checked before apifySocial email", () => {
  const apifyWebsitePos = mergeBlock.indexOf("apifyWebsiteResult?.emails?.[0]");
  const apifySocialPos = mergeBlock.indexOf("apifySocialResult?.email");
  assert.ok(apifyWebsitePos >= 0, "apifyWebsiteResult.emails[0] should exist in merge block");
  assert.ok(apifySocialPos >= 0, "apifySocialResult.email should exist in merge block");
  assert.ok(apifyWebsitePos < apifySocialPos, "apifyWebsite email must come before apifySocial email");
});

test("apifySocial email is checked before sonar email", () => {
  const apifySocialPos = mergeBlock.indexOf("apifySocialResult?.email");
  const sonarPos = mergeBlock.indexOf("sonarResult?.contactEmail");
  assert.ok(apifySocialPos >= 0, "apifySocialResult.email should exist in merge block");
  assert.ok(sonarPos >= 0, "sonarResult.contactEmail should exist in merge block");
  assert.ok(apifySocialPos < sonarPos, "apifySocial email must come before sonar email");
});

// --- emailSource patterns ---

test("emailSource for apify_website includes websiteUrl", () => {
  assert.match(source, /emailSource\s*=\s*`apify_website - \$\{websiteUrl\}`/);
});

test("emailSource for apify_social includes date", () => {
  assert.match(source, /emailSource\s*=\s*`apify_social - \$\{new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)\}`/);
});

test("emailSource for sonar includes lead name and date", () => {
  assert.match(source, /emailSource\s*=\s*`sonar - \$\{lead\.name\} - \$\{new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)\}`/);
});

// --- Social links priority: apifyWebsite > sonar ---

test("social links block merges sonar first, then apifyWebsite (higher priority)", () => {
  const socialBlock = mergeBlock.slice(
    mergeBlock.indexOf("// Social links"),
    mergeBlock.indexOf("// From Sonar — location description"),
  );
  const sonarFbPos = socialBlock.indexOf("sonarResult?.socialLinks?.facebook");
  const apifyFbPos = socialBlock.indexOf("apifyWebsiteResult?.socialLinks?.facebook");
  assert.ok(sonarFbPos >= 0, "sonar facebook check should exist in social block");
  assert.ok(apifyFbPos >= 0, "apifyWebsite facebook check should exist in social block");
  assert.ok(sonarFbPos < apifyFbPos, "sonar facebook applied first, apifyWebsite overwrites");
});

test("apifyWebsite social links can overwrite sonar social links", () => {
  const socialBlock = mergeBlock.slice(
    mergeBlock.indexOf("// Social links"),
    mergeBlock.indexOf("// From Sonar — location description"),
  );
  // Both sources write to the same newSocial object — apifyWebsite second means it wins
  assert.match(socialBlock, /newSocial\.facebook\s*=\s*sonarResult.*facebook/);
  assert.match(socialBlock, /newSocial\.facebook\s*=\s*apifyWebsiteResult.*facebook/);
  assert.match(socialBlock, /newSocial\.instagram\s*=\s*sonarResult.*instagram/);
  assert.match(socialBlock, /newSocial\.instagram\s*=\s*apifyWebsiteResult.*instagram/);
});

// --- Phone fallback: Google Places > sonar > apifySocial ---

test("apifySocialResult.phone is a fallback after sonar for contact phone", () => {
  const phoneBlock = mergeBlock.slice(
    mergeBlock.indexOf("// Phone"),
    mergeBlock.indexOf("// From Sonar — website"),
  );
  assert.match(phoneBlock, /apifySocialResult\?\.phone\s*&&\s*!patch\.contactPhone/);
});

test("apifySocial phone check comes after sonar phone check", () => {
  const phoneBlock = mergeBlock.slice(
    mergeBlock.indexOf("// Phone"),
    mergeBlock.indexOf("// From Sonar — website"),
  );
  const sonarPos = phoneBlock.indexOf("sonarResult?.contactPhone");
  const apifyPos = phoneBlock.indexOf("apifySocialResult?.phone");
  assert.ok(sonarPos >= 0, "sonar phone check should exist");
  assert.ok(apifyPos >= 0, "apifySocial phone check should exist");
  assert.ok(sonarPos < apifyPos, "sonar phone must come before apifySocial phone");
});

test("apifySocial phone respects overwrite flag", () => {
  assert.match(source, /apifySocialResult\?\.phone\s*&&\s*!patch\.contactPhone\s*&&\s*\(!lead\.contactPhone\s*\|\|\s*overwrite\)/);
});
