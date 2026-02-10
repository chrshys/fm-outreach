import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "src/components/leads/bulk-actions.tsx",
  "utf8",
);

// --- Enrich button exists ---

test("bulk actions renders Enrich Selected button", () => {
  assert.match(source, /Enrich Selected/);
});

test("enrich button uses Sparkles icon", () => {
  assert.match(source, /import.*Sparkles.*from.*lucide-react/);
  assert.match(source, /<Sparkles/);
});

// --- Convex integration ---

test("uses useAction to call batchEnrich public action", () => {
  assert.match(source, /useAction\(api\.enrichment\.batchEnrichPublic\.batchEnrich\)/);
});

test("calls batchEnrich with selectedLeadIds", () => {
  assert.match(source, /await\s+batchEnrich\(\{\s*leadIds:\s*selectedLeadIds\s*\}\)/);
});

// --- Enriching state ---

test("tracks isEnriching state", () => {
  assert.match(source, /const\s*\[isEnriching,\s*setIsEnriching\]\s*=\s*useState\(false\)/);
});

test("button is disabled while enriching", () => {
  assert.match(source, /disabled=\{isEnriching\s*\|\|\s*isApplying\}/);
});

test("button shows Enriching... text while in progress", () => {
  assert.match(source, /isEnriching\s*\?\s*"Enriching\.\.\."\s*:\s*"Enrich Selected"/);
});

// --- Toast notifications ---

test("imports toast from sonner", () => {
  assert.match(source, /import.*toast.*from.*sonner/);
});

test("shows info toast when enrichment starts", () => {
  assert.match(source, /toast\.info\(/);
  assert.match(source, /Enriching.*lead/);
});

test("shows success toast when enrichment completes without failures", () => {
  assert.match(source, /toast\.success\(/);
  assert.match(source, /Enrichment complete/);
});

test("shows warning toast when enrichment has failures", () => {
  assert.match(source, /toast\.warning\(/);
  assert.match(source, /failed/);
});

test("shows error toast on exception", () => {
  assert.match(source, /toast\.error\(/);
  assert.match(source, /Enrichment failed/);
});

// --- Calls onComplete after enrichment ---

test("calls onComplete after successful enrichment", () => {
  // onComplete is called in the try block after batchEnrich
  assert.match(source, /onComplete\(\)/);
});
