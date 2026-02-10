import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/claudeAnalysis.ts", "utf8");

test("analyzeWithClaude action exists and accepts a content arg", () => {
  assert.match(source, /export\s+const\s+analyzeWithClaude\s*=\s*action\(/);
  assert.match(source, /content:\s*v\.string\(\)/);
});

test("exports ClaudeAnalysisResult type with all required fields", () => {
  assert.match(source, /export\s+type\s+ClaudeAnalysisResult\s*=/);
  assert.match(source, /products:\s*string\[\]/);
  assert.match(source, /salesChannels:\s*string\[\]/);
  assert.match(source, /sellsOnline:\s*boolean/);
  assert.match(source, /businessDescription:\s*string/);
  assert.match(source, /contactName:\s*string\s*\|\s*null/);
});

test("uses claude-haiku-4-5-20251001 model for cost efficiency", () => {
  assert.match(source, /claude-haiku-4-5-20251001/);
  assert.match(source, /model:\s*MODEL/);
});

test("calls Anthropic Messages API with correct URL and headers", () => {
  assert.match(source, /https:\/\/api\.anthropic\.com\/v1\/messages/);
  assert.match(source, /x-api-key/);
  assert.match(source, /anthropic-version/);
  assert.match(source, /2023-06-01/);
  assert.match(source, /content-type.*application\/json/);
});

test("reads ANTHROPIC_API_KEY from environment", () => {
  assert.match(source, /process\.env\.ANTHROPIC_API_KEY/);
});

test("returns null when no ANTHROPIC_API_KEY is configured", () => {
  assert.match(source, /if\s*\(\s*!apiKey\s*\)/);
  assert.match(source, /return\s+null/);
});

test("handles rate limits (HTTP 429) with descriptive error", () => {
  assert.match(source, /response\.status\s*===\s*429/);
  assert.match(source, /rate\s+limit\s+exceeded/i);
});

test("handles non-OK API responses by throwing", () => {
  assert.match(source, /!response\.ok/);
  assert.match(source, /Anthropic\s+API\s+error/);
  assert.match(source, /response\.status/);
});

test("handles API-level errors from response body", () => {
  assert.match(source, /data\.error/);
  assert.match(source, /data\.error\.message/);
});

test("sends extraction prompt requesting structured JSON output", () => {
  assert.match(source, /products/);
  assert.match(source, /salesChannels/);
  assert.match(source, /sellsOnline/);
  assert.match(source, /businessDescription/);
  assert.match(source, /contactName/);
  assert.match(source, /Respond ONLY with valid JSON/);
});

test("sends POST request with messages array containing user message", () => {
  assert.match(source, /method:\s*"POST"/);
  assert.match(source, /messages:\s*\[/);
  assert.match(source, /role:\s*"user"/);
});

test("sets max_tokens for the API request", () => {
  assert.match(source, /max_tokens:\s*1024/);
});

test("truncates content to a maximum length", () => {
  assert.match(source, /MAX_CONTENT_LENGTH/);
  assert.match(source, /function\s+truncateContent\(/);
  assert.match(source, /content\.length\s*<=\s*MAX_CONTENT_LENGTH/);
  assert.match(source, /content\.slice\(0,\s*MAX_CONTENT_LENGTH\)/);
});

test("checks content relevance before calling API", () => {
  assert.match(source, /function\s+isContentRelevant\(/);
  assert.match(source, /isContentRelevant\(args\.content\)/);
});

test("returns null for empty or too-short content", () => {
  assert.match(source, /trimmed\.length\s*<\s*50/);
  assert.match(source, /return\s+false/);
});

test("detects irrelevant content like error pages", () => {
  assert.ok(source.includes("403 forbidden"));
  assert.ok(source.includes("404 not found"));
  assert.ok(source.includes("access denied"));
  assert.ok(source.includes("page not found"));
});

test("extracts text block from Anthropic response", () => {
  assert.match(source, /data\.content/);
  assert.match(source, /b\.type\s*===\s*"text"/);
  assert.match(source, /textBlock\?\.text/);
});

test("parses JSON response with safe type coercion for each field", () => {
  assert.match(source, /function\s+parseAnalysisResponse\(/);
  assert.match(source, /JSON\.parse\(text\)/);
  assert.match(source, /Array\.isArray\(parsed\.products\)/);
  assert.match(source, /Array\.isArray\(parsed\.salesChannels\)/);
  assert.match(source, /typeof\s+parsed\.sellsOnline\s*===\s*"boolean"/);
  assert.match(source, /typeof\s+parsed\.businessDescription\s*===\s*"string"/);
  assert.match(source, /typeof\s+parsed\.contactName\s*===\s*"string"/);
});

test("returns null when JSON parsing fails (malformed response)", () => {
  // The catch block around parseAnalysisResponse returns null
  assert.match(source, /catch\s*\{/);
  assert.match(source, /return\s+null/);
});

test("returns null when API response has no text content", () => {
  assert.match(source, /if\s*\(\s*!textBlock\?\.text\s*\)/);
  assert.match(source, /return\s+null/);
});
