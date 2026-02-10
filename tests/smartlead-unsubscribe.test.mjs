import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/smartlead/unsubscribe.ts", "utf8");

// --- Module structure ---

test("imports internalMutation from generated server", () => {
  assert.match(
    source,
    /import\s*\{[^}]*internalMutation[^}]*\}\s*from\s*["']\.\.\/\_generated\/server["']/,
  );
});

test("imports query from generated server", () => {
  assert.match(
    source,
    /import\s*\{[^}]*query[^}]*\}\s*from\s*["']\.\.\/\_generated\/server["']/,
  );
});

test("imports v from convex/values", () => {
  assert.match(source, /import\s*\{\s*v\s*\}\s*from\s*["']convex\/values["']/);
});

// --- unsubscribe mutation ---

test("exports unsubscribe as internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+unsubscribe\s*=\s*internalMutation/,
  );
});

test("unsubscribe accepts email string argument", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /email:\s*v\.string\(\)/);
});

test("unsubscribe accepts optional reason argument", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /reason:\s*v\.optional\(v\.string\(\)\)/);
});

test("unsubscribe normalizes email to lowercase", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /\.toLowerCase\(\)/);
});

test("unsubscribe trims email whitespace", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /\.trim\(\)/);
});

test("unsubscribe is idempotent — checks for existing block list entry", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /emailBlockList/);
  assert.match(unsubSection, /by_email/);
  assert.match(unsubSection, /existing/);
});

test("unsubscribe returns alreadyBlocked true if already on block list", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /alreadyBlocked:\s*true/);
});

test("unsubscribe inserts into emailBlockList", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /ctx\.db\.insert\(["']emailBlockList["']/);
});

test("unsubscribe defaults reason to 'unsubscribed'", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /reason.*\?\?\s*["']unsubscribed["']/);
});

test("unsubscribe updates matching lead status to declined", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /status:\s*["']declined["']/);
  assert.match(unsubSection, /ctx\.db\.patch\(lead\._id/);
});

test("unsubscribe skips lead status update if already declined", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /lead\.status\s*!==\s*["']declined["']/);
});

test("unsubscribe logs status_changed activity for lead", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /ctx\.db\.insert\(["']activities["']/);
  assert.match(unsubSection, /type:\s*["']status_changed["']/);
});

test("unsubscribe throws on empty email", () => {
  const unsubSection = source.slice(
    source.indexOf("export const unsubscribe"),
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(unsubSection, /Email is required/);
});

// --- isUnsubscribed query ---

test("exports isUnsubscribed as query", () => {
  assert.match(
    source,
    /export\s+const\s+isUnsubscribed\s*=\s*query/,
  );
});

test("isUnsubscribed accepts email string argument", () => {
  const querySection = source.slice(
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(querySection, /email:\s*v\.string\(\)/);
});

test("isUnsubscribed normalizes email to lowercase", () => {
  const querySection = source.slice(
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(querySection, /\.toLowerCase\(\)/);
});

test("isUnsubscribed trims email whitespace", () => {
  const querySection = source.slice(
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(querySection, /\.trim\(\)/);
});

test("isUnsubscribed queries emailBlockList with by_email index", () => {
  const querySection = source.slice(
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(querySection, /emailBlockList/);
  assert.match(querySection, /by_email/);
});

test("isUnsubscribed returns boolean (null check)", () => {
  const querySection = source.slice(
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(querySection, /!==\s*null/);
});

test("isUnsubscribed returns false for empty email", () => {
  const querySection = source.slice(
    source.indexOf("export const isUnsubscribed"),
  );
  assert.match(querySection, /return\s+false/);
});

// --- Enrichment orchestrator integration ---

const orchestratorSource = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);

test("enrichment orchestrator imports isUnsubscribed check", () => {
  assert.match(orchestratorSource, /smartlead\.unsubscribe\.isUnsubscribed/);
});

test("enrichment orchestrator checks block list before enrichment", () => {
  // The block list check should happen before the cooldown check
  const blockListCheckPos = orchestratorSource.indexOf("isUnsubscribed");
  const cooldownCheckPos = orchestratorSource.indexOf("Check cooldown");
  assert.ok(blockListCheckPos !== -1, "Should reference isUnsubscribed");
  assert.ok(cooldownCheckPos !== -1, "Should have cooldown check");
  assert.ok(
    blockListCheckPos < cooldownCheckPos,
    "Block list check should come before cooldown check",
  );
});

test("enrichment orchestrator skips enrichment for blocked leads", () => {
  const blockCheckSection = orchestratorSource.slice(
    orchestratorSource.indexOf("block list"),
    orchestratorSource.indexOf("Step 1"),
  );
  assert.match(blockCheckSection, /skipped:\s*true/);
});

test("enrichment orchestrator logs enrichment_skipped for blocked leads", () => {
  const blockCheckSection = orchestratorSource.slice(
    orchestratorSource.indexOf("block list"),
    orchestratorSource.indexOf("Step 1"),
  );
  assert.match(blockCheckSection, /enrichment_skipped/);
});
