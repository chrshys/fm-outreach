import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/websiteScraper.ts", "utf8");

test("scrapeWebsite action exists and accepts a url arg", () => {
  assert.match(source, /export\s+const\s+scrapeWebsite\s*=\s*action\(/);
  assert.match(source, /url:\s*v\.string\(\)/);
});

test("exports WebsiteScraperResult type with correct fields", () => {
  assert.match(source, /export\s+type\s+WebsiteScraperResult\s*=/);
  assert.match(source, /emails:\s*string\[\]/);
  assert.match(source, /socialLinks:/);
  assert.match(source, /facebook:\s*string\[\]/);
  assert.match(source, /instagram:\s*string\[\]/);
  assert.match(source, /products:\s*string\[\]/);
  assert.match(source, /platform:\s*"shopify"\s*\|\s*"square"\s*\|\s*null/);
});

test("fetches URL with timeout using AbortController", () => {
  assert.match(source, /new\s+AbortController\(\)/);
  assert.match(source, /setTimeout\(/);
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /signal:\s*controller\.signal/);
  assert.match(source, /clearTimeout\(timeout\)/);
});

test("timeout is set to 5 seconds", () => {
  assert.match(source, /FETCH_TIMEOUT_MS\s*=\s*5000/);
});

test("sets User-Agent and Accept headers on fetch", () => {
  assert.match(source, /User-Agent/);
  assert.match(source, /Accept.*text\/html/);
});

test("checks content-type and returns null for non-HTML responses", () => {
  assert.match(source, /content-type/);
  assert.match(source, /text\/html/);
  assert.match(source, /return\s+null/);
});

test("extracts email addresses using regex including mailto: pattern", () => {
  assert.match(source, /mailto:/i);
  assert.match(source, /EMAIL_REGEX/);
  assert.match(source, /MAILTO_REGEX/);
  assert.match(source, /extractEmails/);
});

test("email extraction deduplicates and filters boilerplate emails", () => {
  assert.match(source, /new\s+Set\(/);
  assert.match(source, /isBoilerplateEmail/);
  assert.match(source, /toLowerCase\(\)/);
});

test("extracts Facebook social links", () => {
  assert.ok(source.includes("facebook"));
  assert.match(source, /FACEBOOK_REGEX/);
  assert.match(source, /extractSocialLinks/);
});

test("extracts Instagram social links", () => {
  assert.ok(source.includes("instagram"));
  assert.match(source, /INSTAGRAM_REGEX/);
});

test("extracts products from og:type and JSON-LD structured data", () => {
  assert.match(source, /og:type/);
  assert.match(source, /og:title/);
  assert.ok(source.includes("ld\\+json"));
  assert.match(source, /@type/);
  assert.match(source, /Product/);
  assert.match(source, /extractProducts/);
});

test("detects Shopify platform via myshopify.com, cdn.shopify.com, Shopify.theme, or meta generator", () => {
  assert.ok(source.includes("myshopify.com"));
  assert.ok(source.includes("cdn.shopify.com"));
  assert.ok(source.includes("Shopify.theme"));
  assert.match(source, /generator/);
  assert.match(source, /detectPlatform/);
});

test("detects Square platform via squareup.com or square.site", () => {
  assert.ok(source.includes("squareup.com"));
  assert.ok(source.includes("square.site"));
});

test("returns null for unreachable sites (fetch errors)", () => {
  assert.match(source, /catch\s*\(/);
  assert.match(source, /return\s+null/);
});

test("returns null on timeout (AbortError)", () => {
  assert.match(source, /AbortError/);
  assert.match(source, /return\s+null/);
});

test("returns structured result with emails, socialLinks, products, platform", () => {
  assert.match(source, /return\s*\{/);
  assert.match(source, /emails,/);
  assert.match(source, /socialLinks,/);
  assert.match(source, /products,/);
  assert.match(source, /platform,/);
});
