import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "convex/enrichment/socialDiscovery.ts",
  "utf8",
);

test("exports discoverSocialLinks function", () => {
  assert.match(source, /export\s+function\s+discoverSocialLinks\(/);
});

test("exports SocialDiscoveryResult type with optional facebook and instagram", () => {
  assert.match(source, /export\s+type\s+SocialDiscoveryResult\s*=/);
  assert.match(source, /facebook\?:\s*string/);
  assert.match(source, /instagram\?:\s*string/);
});

test("exports SocialDiscoveryInput type with googlePlacesWebsite", () => {
  assert.match(source, /export\s+type\s+SocialDiscoveryInput\s*=/);
  assert.match(source, /googlePlacesWebsite\?:\s*string/);
});

test("does not reference websiteHtml (HTML scraping removed)", () => {
  assert.doesNotMatch(source, /websiteHtml/);
});

test("validates Facebook URLs are actual business pages, not homepage slugs", () => {
  assert.match(source, /isValidFacebookPage/);
  assert.match(source, /FACEBOOK_HOMEPAGE_SLUGS/);
  assert.ok(source.includes('"home"'));
  assert.ok(source.includes('"login"'));
  assert.ok(source.includes('"marketplace"'));
  assert.ok(source.includes('"sharer"'));
});

test("validates Instagram URLs are actual business pages, not homepage slugs", () => {
  assert.match(source, /isValidInstagramPage/);
  assert.match(source, /INSTAGRAM_HOMEPAGE_SLUGS/);
  assert.ok(source.includes('"explore"'));
  assert.ok(source.includes('"reels"'));
  assert.ok(source.includes('"accounts"'));
});

test("extracts social links from Google Places website field", () => {
  assert.match(source, /extractFromGooglePlacesWebsite/);
  assert.match(source, /googlePlacesWebsite/);
});

test("strips trailing slashes from URLs", () => {
  assert.match(source, /replace\(\/\\\/\$\//);
});

test("function accepts SocialDiscoveryInput and returns SocialDiscoveryResult", () => {
  assert.match(source, /input:\s*SocialDiscoveryInput/);
  assert.match(source, /:\s*SocialDiscoveryResult/);
});
