import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/sonarEnrich.ts", "utf8");

test("enrichWithSonar action exists and is exported", () => {
  assert.match(source, /export\s+const\s+enrichWithSonar\s*=\s*action\(/);
});

test("action accepts all required args with correct validators", () => {
  assert.match(source, /name:\s*v\.string\(\)/);
  assert.match(source, /address:\s*v\.string\(\)/);
  assert.match(source, /city:\s*v\.string\(\)/);
  assert.match(source, /province:\s*v\.string\(\)/);
  assert.match(source, /type:\s*v\.string\(\)/);
});

test("action accepts optional website and useSonarPro args", () => {
  assert.match(source, /website:\s*v\.optional\(v\.string\(\)\)/);
  assert.match(source, /useSonarPro:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("reads AI_GATEWAY_API_KEY from environment", () => {
  assert.match(source, /process\.env\.AI_GATEWAY_API_KEY/);
});

test("returns null when no API key is configured", () => {
  assert.match(source, /if\s*\(\s*!apiKey\s*\)/);
  assert.match(source, /return\s+null/);
});

test("selects perplexity/sonar-pro when useSonarPro is true", () => {
  assert.match(source, /perplexity\/sonar-pro/);
});

test("selects perplexity/sonar as default model", () => {
  assert.match(source, /perplexity\/sonar"/);
});

test("calls AI gateway URL with correct endpoint", () => {
  assert.match(source, /https:\/\/ai-gateway\.vercel\.sh\/v1\/chat\/completions/);
});

test("sends Authorization Bearer header with API key", () => {
  assert.match(source, /Authorization:\s*`Bearer\s*\$\{apiKey\}`/);
});

test("sends Content-Type application/json header", () => {
  assert.match(source, /Content-Type.*application\/json/);
});

test("sends POST request with system and user messages", () => {
  assert.match(source, /method:\s*"POST"/);
  assert.match(source, /messages:\s*\[/);
  assert.match(source, /role:\s*"system"/);
  assert.match(source, /role:\s*"user"/);
});

test("system message contains SONAR_ENRICHMENT_PROMPT", () => {
  assert.match(source, /role:\s*"system",\s*content:\s*SONAR_ENRICHMENT_PROMPT/);
});

test("strips markdown fences from response before JSON parsing", () => {
  assert.match(source, /replace.*```/);
});

test("handles rate limits (HTTP 429) with descriptive error", () => {
  assert.match(source, /response\.status\s*===\s*429/);
  assert.match(source, /rate\s+limit\s+exceeded/i);
});

test("handles non-OK API responses by throwing with status", () => {
  assert.match(source, /!response\.ok/);
  assert.match(source, /Sonar\s+API\s+error/);
  assert.match(source, /response\.status/);
});

test("parses OpenAI-compatible response format", () => {
  assert.match(source, /data\.choices\?\.\[0\]\?\.message\?\.content/);
});

test("returns null when response has no content", () => {
  assert.match(source, /if\s*\(\s*!content\s*\)/);
  assert.match(source, /return\s+null/);
});

test("parses JSON response with defensive type checking", () => {
  assert.match(source, /function\s+parseSonarResponse\(/);
  assert.match(source, /JSON\.parse\(cleaned\)/);
  assert.match(source, /typeof\s+parsed\.contactEmail\s*===\s*"string"/);
  assert.match(source, /typeof\s+parsed\.contactName\s*===\s*"string"/);
  assert.match(source, /typeof\s+parsed\.contactPhone\s*===\s*"string"/);
  assert.match(source, /typeof\s+parsed\.website\s*===\s*"string"/);
  assert.match(source, /typeof\s+parsed\.sellsOnline\s*===\s*"boolean"/);
  assert.match(source, /typeof\s+parsed\.businessDescription\s*===\s*"string"/);
  assert.match(source, /Array\.isArray\(parsed\.products\)/);
  assert.match(source, /Array\.isArray\(parsed\.salesChannels\)/);
});

test("parses isSeasonal with defensive type checking", () => {
  assert.match(source, /typeof\s+parsed\.isSeasonal\s*===\s*"boolean"/);
});

test("parses seasonalNote with defensive type checking", () => {
  assert.match(source, /typeof\s+parsed\.seasonalNote\s*===\s*"string"/);
});

test("parses structuredProducts with defensive validation", () => {
  assert.match(source, /function\s+parseStructuredProducts\(/);
  assert.match(source, /typeof\s+item\.name\s*===\s*"string"/);
  assert.match(source, /typeof\s+item\.category\s*===\s*"string"/);
});

test("parses structuredDescription with fallback", () => {
  assert.match(source, /function\s+parseStructuredDescription\(/);
  assert.match(source, /typeof\s+obj\.summary\s*===\s*"string"/);
  assert.match(source, /Array\.isArray\(obj\.specialties\)/);
  assert.match(source, /Array\.isArray\(obj\.certifications\)/);
});

test("parses socialLinks with defensive validation", () => {
  assert.match(source, /function\s+parseSocialLinks\(/);
  assert.match(source, /typeof\s+obj\.facebook\s*===\s*"string"/);
  assert.match(source, /typeof\s+obj\.instagram\s*===\s*"string"/);
});

test("extracts citations from response metadata", () => {
  assert.match(source, /data\.citations/);
  assert.match(source, /Array\.isArray\(data\.citations\)/);
});

test("returns null when JSON parsing fails", () => {
  assert.match(source, /catch\s*\{/);
  assert.match(source, /return\s+null/);
});

test("sends enrichment prompt requesting all SonarEnrichResult fields", () => {
  assert.match(source, /contactEmail/);
  assert.match(source, /contactName/);
  assert.match(source, /contactPhone/);
  assert.match(source, /socialLinks/);
  assert.match(source, /structuredProducts/);
  assert.match(source, /salesChannels/);
  assert.match(source, /sellsOnline/);
  assert.match(source, /businessDescription/);
  assert.match(source, /structuredDescription/);
  assert.match(source, /locationDescription/);
  assert.match(source, /imagePrompt/);
  assert.match(source, /isSeasonal/);
  assert.match(source, /seasonalNote/);
  assert.match(source, /Respond ONLY with valid JSON/);
});

test("prompt is exported as SONAR_ENRICHMENT_PROMPT const", () => {
  assert.match(source, /const\s+SONAR_ENRICHMENT_PROMPT\s*=/);
});

test("prompt instructs to search the web for the business", () => {
  assert.match(source, /[Ss]earch the web/);
});

test("prompt includes verification warning against fabrication", () => {
  assert.match(
    source,
    /Only include information you can verify from web sources/
  );
  assert.match(
    source,
    /Return null for any field you cannot confirm/
  );
  assert.match(
    source,
    /Never fabricate email addresses, phone numbers, or URLs/
  );
});

test("prompt lists all product categories", () => {
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
    assert.match(source, new RegExp(`"${cat}"`), `missing category: ${cat}`);
  }
});

test("prompt describes locationDescription as 2-3 sentences for marketplace listing", () => {
  assert.match(source, /locationDescription/);
  assert.match(source, /2-3 sentences/);
  assert.match(source, /marketplace listing/);
});

test("prompt requests isSeasonal and seasonalNote fields", () => {
  assert.match(source, /isSeasonal/);
  assert.match(source, /seasonalNote/);
});

test("prompt describes imagePrompt for AI image generation with product-focused style", () => {
  assert.match(source, /imagePrompt/);
  assert.match(source, /AI image generation/);
  assert.match(source, /close-up/);
  assert.match(source, /Do NOT include.*business name/);
});

test("user message interpolates lead details with labeled fields", () => {
  assert.match(source, /Search the web for information about this business/);
  assert.match(source, /Name:\s*\$\{args\.name\}/);
  assert.match(source, /Type:\s*\$\{args\.type\}/);
  assert.match(source, /Address:\s*\$\{args\.address\}/);
  assert.match(source, /City:\s*\$\{args\.city\}/);
  assert.match(source, /Province:\s*\$\{args\.province\}/);
});

test("user message appends Website line only when website is provided", () => {
  assert.match(source, /if\s*\(args\.website\)/);
  assert.match(source, /Website:\s*\$\{args\.website\}/);
});
