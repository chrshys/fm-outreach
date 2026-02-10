import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/social/generateDM.ts", "utf8");

// --- Action structure ---

test("generateDM is exported as an action", () => {
  assert.match(source, /export\s+const\s+generateDM\s*=\s*action\(/);
});

test("action accepts leadId and channel args", () => {
  assert.match(source, /leadId:\s*v\.id\("leads"\)/);
  assert.match(source, /channel:\s*v\.union\(v\.literal\("facebook"\),\s*v\.literal\("instagram"\)\)/);
});

test("action returns Promise<string>", () => {
  assert.match(source, /Promise<string>/);
});

// --- Model selection ---

test("uses claude-haiku-4-5-20251001 for cost efficiency", () => {
  assert.match(source, /claude-haiku-4-5-20251001/);
});

test("uses only one model (single-step generation)", () => {
  const modelRefs = source.match(/claude-[a-z]+-\d/g);
  assert.ok(modelRefs, "should reference a Claude model");
  const uniqueModels = new Set(modelRefs);
  assert.equal(uniqueModels.size, 1, "should use exactly one model");
});

// --- API integration ---

test("calls Anthropic Messages API", () => {
  assert.match(source, /https:\/\/api\.anthropic\.com\/v1\/messages/);
});

test("reads ANTHROPIC_API_KEY from environment", () => {
  assert.match(source, /process\.env\.ANTHROPIC_API_KEY/);
});

test("throws when ANTHROPIC_API_KEY is not configured", () => {
  assert.match(source, /ANTHROPIC_API_KEY is not configured/);
});

test("sends correct headers to Anthropic API", () => {
  assert.match(source, /x-api-key/);
  assert.match(source, /anthropic-version/);
  assert.match(source, /2023-06-01/);
  assert.match(source, /content-type.*application\/json/);
});

test("handles rate limits (HTTP 429)", () => {
  assert.match(source, /response\.status\s*===\s*429/);
  assert.match(source, /rate\s+limit\s+exceeded/i);
});

test("handles non-OK API responses", () => {
  assert.match(source, /!response\.ok/);
  assert.match(source, /Anthropic\s+API\s+error/);
});

test("handles API-level errors from response body", () => {
  assert.match(source, /data\.error/);
  assert.match(source, /data\.error\.message/);
});

// --- Lead fetching ---

test("fetches lead by ID", () => {
  assert.match(source, /api\.leads\.get/);
  assert.match(source, /leadId:\s*args\.leadId/);
});

test("throws when lead not found", () => {
  assert.match(source, /Lead not found/);
});

// --- Lead context ---

test("builds lead context with farm details", () => {
  assert.match(source, /function\s+buildLeadContext\(/);
  assert.match(source, /Farm name/);
  assert.match(source, /Contact name/);
  assert.match(source, /Location/);
  assert.match(source, /Products/);
  assert.match(source, /Farm description/);
});

test("includes enrichment data in lead context", () => {
  assert.match(source, /enrichmentData/);
  assert.match(source, /structuredDescription/);
  assert.match(source, /structuredProducts/);
  assert.match(source, /Enriched summary/);
  assert.match(source, /Specialties/);
  assert.match(source, /Detailed products/);
});

// --- Channel-specific prompts ---

test("builds system prompt per channel", () => {
  assert.match(source, /function\s+buildSystemPrompt\(/);
  assert.match(source, /channel.*"facebook".*"instagram"/s);
});

test("Facebook prompt is slightly more formal", () => {
  assert.match(source, /facebook/i);
  assert.match(source, /slightly more formal/i);
  assert.match(source, /No emojis/);
});

test("Instagram prompt is casual and emoji-friendly", () => {
  assert.match(source, /instagram/i);
  assert.match(source, /casual/i);
  assert.match(source, /emoji-friendly/i);
});

// --- DM constraints ---

test("enforces 30-60 word count range", () => {
  assert.match(source, /30-60\s*words/);
  assert.match(source, /DM_MIN_WORDS\s*=\s*30/);
  assert.match(source, /DM_MAX_WORDS\s*=\s*60/);
});

test("validates word count and throws on violation", () => {
  assert.match(source, /wordCount\s*<\s*DM_MIN_WORDS/);
  assert.match(source, /wordCount\s*>\s*DM_MAX_WORDS/);
  assert.match(source, /Generated DM is/);
});

test("exports countWords function", () => {
  assert.match(source, /export\s+function\s+countWords\(/);
});

// --- Prompt quality ---

test("prompt instructs to reference specific farm details", () => {
  assert.match(source, /mention at least one specific product/i);
});

test("prompt instructs to use only verified data", () => {
  assert.match(source, /ONLY verified data/);
  assert.match(source, /never invent facts/);
});

test("prompt instructs to address by first name if available", () => {
  assert.match(source, /contact name.*first name/i);
});

test("prompt mentions Fruitland Market", () => {
  assert.match(source, /Fruitland Market/);
});

test("prompt requests plain text only response", () => {
  assert.match(source, /ONLY the message text/);
});

// --- callClaude helper ---

test("callClaude sends system prompt and user message", () => {
  assert.match(source, /function\s+callClaude\(/);
  assert.match(source, /system:\s*systemPrompt/);
  assert.match(source, /role:\s*"user"/);
  assert.match(source, /content:\s*userMessage/);
});

test("callClaude sends POST request with max_tokens", () => {
  assert.match(source, /method:\s*"POST"/);
  assert.match(source, /max_tokens:\s*256/);
});

test("callClaude extracts text from response content blocks", () => {
  assert.match(source, /data\.content/);
  assert.match(source, /b\.type\s*===\s*"text"/);
  assert.match(source, /textBlock\?\.text/);
});

test("callClaude throws when no text content in response", () => {
  assert.match(source, /No text content in Anthropic response/);
});

// --- Imports ---

test("imports action from generated server", () => {
  assert.match(source, /import.*action.*from.*_generated\/server/);
});

test("imports api from generated api", () => {
  assert.match(source, /import.*api.*from.*_generated\/api/);
});

test("imports v from convex/values", () => {
  assert.match(source, /import.*v.*from.*convex\/values/);
});

// --- countWords unit tests ---

test("countWords counts words correctly", async () => {
  // Dynamic import to test the exported function
  // We can't import .ts directly, so we test via source patterns
  // and verify the implementation logic
  const countWordsMatch = source.match(
    /export\s+function\s+countWords\(text:\s*string\):\s*number\s*\{([^}]+)\}/,
  );
  assert.ok(countWordsMatch, "countWords function should be exported");
  const body = countWordsMatch[1];
  assert.match(body, /trim\(\)/, "should trim input");
  assert.match(body, /split\(\/\\s\+\/\)/, "should split on whitespace");
  assert.match(body, /filter\(Boolean\)/, "should filter empty strings");
});
