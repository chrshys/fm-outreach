import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("scripts/generate-email.ts", "utf8");

test("generate-email script includes tsx run instructions", () => {
  assert.match(source, /Run with:\s*npx tsx scripts\/generate-email\.ts/);
});

test("script reads lead name or ID from command line arguments", () => {
  assert.match(source, /process\.argv\[2\]/);
});

test("script shows usage instructions when input is missing", () => {
  assert.match(source, /Usage:/);
  assert.match(source, /generate-email\.ts\s*<lead-name-or-id>/);
});

test("script uses convex url from environment with validation", () => {
  assert.match(source, /process\.env\.CONVEX_URL\s*\?\?\s*process\.env\.NEXT_PUBLIC_CONVEX_URL/);
  assert.match(
    source,
    /Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable/,
  );
});

test("script searches for leads by name", () => {
  assert.match(source, /api\.leads\.search/);
  assert.match(source, /text:\s*input/);
});

test("script falls back to direct ID lookup when search returns no results", () => {
  assert.match(source, /api\.leads\.get/);
  assert.match(source, /leadId:\s*input/);
});

test("script shows multiple matches when search returns more than one lead", () => {
  assert.match(source, /searchResults\.length > 1/);
  assert.match(source, /using first match/);
});

test("script fetches email templates and finds default initial template", () => {
  assert.match(source, /api\.emailTemplates\.list/);
  assert.match(source, /sequenceType === "initial"/);
  assert.match(source, /isDefault/);
});

test("script errors when no default initial template is found", () => {
  assert.match(source, /No default initial email template found/);
});

test("script calls generateEmail action with leadId and templateId", () => {
  assert.match(source, /api\.email\.generateEmail\.generateEmail/);
  assert.match(source, /convex\.action\(generateRef/);
  assert.match(source, /leadId/);
  assert.match(source, /templateId:\s*initialTemplate\._id/);
});

test("script prints subject and body to terminal", () => {
  assert.match(source, /Subject: /);
  assert.match(source, /result\.subject/);
  assert.match(source, /result\.body/);
});

test("script handles errors gracefully with non-zero exit code", () => {
  assert.match(source, /process\.exitCode = 1/);
  assert.match(source, /Email generation failed:/);
});
