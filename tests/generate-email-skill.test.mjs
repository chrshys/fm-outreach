import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const skillDoc = fs.readFileSync(".claude/skills/generate-email.md", "utf8");

test("skill doc exists and has correct title", () => {
  assert.match(skillDoc, /^# \/generate-email/m);
});

test("skill doc includes the CLI command", () => {
  assert.match(skillDoc, /npx tsx scripts\/generate-email\.ts/);
});

test("skill doc describes lead name or ID input", () => {
  assert.match(skillDoc, /lead name/i);
  assert.match(skillDoc, /Convex document ID/i);
});

test("skill doc lists required environment variables", () => {
  assert.match(skillDoc, /CONVEX_URL/);
  assert.match(skillDoc, /ANTHROPIC_API_KEY/);
});

test("skill doc references the generateEmail convex action", () => {
  assert.match(skillDoc, /convex\/email\/generateEmail\.ts/);
  assert.match(skillDoc, /generateEmail/);
});

test("skill doc includes usage examples", () => {
  assert.match(skillDoc, /## Examples/);
  assert.match(skillDoc, /generate-email\.ts/);
});

test("skill doc describes the two-stage Claude pipeline", () => {
  assert.match(skillDoc, /Haiku/);
  assert.match(skillDoc, /Sonnet/);
});
