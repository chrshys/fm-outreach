import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(".claude/skills/import-csv.md", "utf8");

test("skill doc has the correct title", () => {
  assert.match(source, /^# \/import-csv/m);
});

test("skill doc includes the CLI command", () => {
  assert.match(source, /npx tsx scripts\/import-csv\.ts/);
});

test("skill doc documents inserted result", () => {
  assert.match(source, /Inserted/);
});

test("skill doc documents duplicated result", () => {
  assert.match(source, /Duplicated/);
});

test("skill doc documents errored result", () => {
  assert.match(source, /Errored/);
});

test("skill doc references the convex action at correct path", () => {
  assert.match(source, /convex\/seeds\/importLeads\.ts/);
});

test("skill doc documents CONVEX_URL requirement", () => {
  assert.match(source, /CONVEX_URL/);
});

test("skill doc includes expected CSV columns table", () => {
  assert.match(source, /Name/);
  assert.match(source, /Email address/);
  assert.match(source, /Town \/ City/);
  assert.match(source, /Categories/);
});

test("skill doc includes usage examples", () => {
  assert.match(source, /data\/farms\.csv/);
  assert.match(source, /data\/farmers-markets\.csv/);
});
