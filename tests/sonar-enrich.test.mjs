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

test("uses response_format for structured output", () => {
  assert.match(source, /response_format:\s*\{\s*type:\s*"json_object"\s*\}/);
});

test("handles 429 rate limit", () => {
  assert.match(source, /response\.status\s*===\s*429/);
  assert.match(source, /rate\s+limit\s+exceeded/i);
});

test('prompt contains "Never fabricate" instruction', () => {
  assert.match(source, /Never fabricate/);
});
