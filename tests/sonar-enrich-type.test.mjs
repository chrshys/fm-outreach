import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/sonarEnrich.ts", "utf8");

test("exports SonarEnrichResult type", () => {
  assert.match(source, /export\s+type\s+SonarEnrichResult\s*=/);
});

test("SonarEnrichResult has contactEmail as string | null", () => {
  assert.match(source, /contactEmail:\s*string\s*\|\s*null/);
});

test("SonarEnrichResult has contactName as string | null", () => {
  assert.match(source, /contactName:\s*string\s*\|\s*null/);
});

test("SonarEnrichResult has contactPhone as string | null", () => {
  assert.match(source, /contactPhone:\s*string\s*\|\s*null/);
});

test("SonarEnrichResult has website as string | null", () => {
  assert.match(source, /website:\s*string\s*\|\s*null/);
});

test("SonarEnrichResult has socialLinks with facebook and instagram", () => {
  assert.match(source, /socialLinks:\s*\{/);
  assert.match(source, /facebook:\s*string\s*\|\s*null/);
  assert.match(source, /instagram:\s*string\s*\|\s*null/);
});

test("SonarEnrichResult has products as string[]", () => {
  assert.match(source, /products:\s*string\[\]/);
});

test("SonarEnrichResult has structuredProducts with name and category", () => {
  assert.match(source, /structuredProducts:\s*Array<\{\s*name:\s*string;\s*category:\s*string\s*\}>/);
});

test("SonarEnrichResult has salesChannels as string[]", () => {
  assert.match(source, /salesChannels:\s*string\[\]/);
});

test("SonarEnrichResult has sellsOnline as boolean", () => {
  assert.match(source, /sellsOnline:\s*boolean/);
});

test("SonarEnrichResult has businessDescription as string", () => {
  assert.match(source, /businessDescription:\s*string/);
});

test("SonarEnrichResult has structuredDescription with summary, specialties, certifications", () => {
  assert.match(source, /structuredDescription:\s*\{/);
  assert.match(source, /summary:\s*string/);
  assert.match(source, /specialties:\s*string\[\]/);
  assert.match(source, /certifications:\s*string\[\]/);
});

test("SonarEnrichResult has locationDescription as string", () => {
  assert.match(source, /locationDescription:\s*string/);
});

test("SonarEnrichResult has imagePrompt as string", () => {
  assert.match(source, /imagePrompt:\s*string/);
});

test("SonarEnrichResult has isSeasonal as boolean | null", () => {
  assert.match(source, /isSeasonal:\s*boolean\s*\|\s*null/);
});

test("SonarEnrichResult has seasonalNote as string | null", () => {
  assert.match(source, /seasonalNote:\s*string\s*\|\s*null/);
});

test("SonarEnrichResult has citations as string[]", () => {
  assert.match(source, /citations:\s*string\[\]/);
});
