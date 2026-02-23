import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/sonarEnrich.ts", "utf8");

test("exports enrichWithSonar action", () => {
  assert.match(source, /export\s+const\s+enrichWithSonar\s*=\s*action\(/);
});

test("exports SonarEnrichResult type", () => {
  assert.match(source, /export\s+type\s+SonarEnrichResult\s*=/);
});

test("reads AI_GATEWAY_API_KEY from process.env", () => {
  assert.match(source, /process\.env\.AI_GATEWAY_API_KEY/);
});

test("uses ai-gateway.vercel.sh endpoint", () => {
  assert.match(
    source,
    /https:\/\/ai-gateway\.vercel\.sh\/v1\/chat\/completions/,
  );
});

test("uses perplexity/sonar as default model", () => {
  assert.match(source, /"perplexity\/sonar"/);
});

test("uses perplexity/sonar-pro when useSonarPro is true", () => {
  assert.match(source, /args\.useSonarPro/);
  assert.match(source, /"perplexity\/sonar-pro"/);
});

test("strips markdown fences from response before parsing", () => {
  assert.match(source, /replace.*```/);
});

test("handles 429 rate limit", () => {
  assert.match(source, /response\.status\s*===\s*429/);
  assert.match(source, /rate\s+limit\s+exceeded/i);
});

test('prompt contains "Never fabricate" instruction', () => {
  assert.match(source, /Never fabricate/);
});

// --- New category prompt tests ---

test("prompt contains all 11 FM category keys", () => {
  const categories = [
    "produce",
    "eggs_dairy",
    "meat_poultry",
    "seafood",
    "baked_goods",
    "pantry",
    "plants",
    "handmade",
    "wellness",
    "beverages",
    "prepared",
  ];
  for (const cat of categories) {
    assert.ok(
      source.includes(`"${cat}"`),
      `prompt should contain "${cat}"`,
    );
  }
});

test("prompt does not contain legacy category keys", () => {
  // These old categories should not appear as category options in the prompt
  const legacyInPrompt = [
    '"dairy"',
    '"eggs"',
    '"meat"',
    '"honey"',
    '"baked goods"',
    '"preserves"',
    '"flowers"',
    '"nursery"',
    '"value-added"',
  ];
  // Extract just the prompt portion
  const promptStart = source.indexOf("SONAR_ENRICHMENT_PROMPT");
  const promptSection = source.slice(promptStart, source.indexOf("`;", promptStart));
  for (const legacy of legacyInPrompt) {
    assert.ok(
      !promptSection.includes(`- ${legacy}`),
      `prompt should not list ${legacy} as a category option`,
    );
  }
});

test('prompt does not offer "other" as a category', () => {
  const promptStart = source.indexOf("SONAR_ENRICHMENT_PROMPT");
  const promptSection = source.slice(promptStart, source.indexOf("`;", promptStart));
  assert.ok(
    !promptSection.includes('- "other"'),
    'prompt should not list "other" as a category option',
  );
});

test("prompt includes product examples for each category", () => {
  // Spot-check a few product examples from the prompt
  assert.ok(source.includes("vegetables, fruits, herbs"), "produce examples");
  assert.ok(source.includes("chicken/duck/quail eggs"), "eggs_dairy examples");
  assert.ok(source.includes("crab, oysters, clams"), "seafood examples");
  assert.ok(source.includes("honey, jams, preserves"), "pantry examples");
  assert.ok(source.includes("soap, candles, pottery"), "handmade examples");
});

test("imports normalizeCategoryKey from categories module", () => {
  assert.match(source, /import\s*\{[^}]*normalizeCategoryKey[^}]*\}\s*from\s*["']\.\/categories["']/);
});

test("parseStructuredProducts uses normalizeCategoryKey", () => {
  assert.match(source, /normalizeCategoryKey\(rawCategory\)/);
});

test("parseStructuredProducts filters out products with empty category", () => {
  assert.match(source, /item\.category\.length\s*>\s*0/);
});
