import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadTsModule(relativePath) {
  const source = fs.readFileSync(relativePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: path.basename(relativePath),
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-leads-list-"));
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`);
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("matchesFilters is exported from convex/lib/leadsList.ts", () => {
  const mod = loadTsModule("convex/lib/leadsList.ts");
  assert.equal(typeof mod.matchesFilters, "function");
});

test("matchesFilters returns true when no filters are applied", () => {
  const { matchesFilters } = loadTsModule("convex/lib/leadsList.ts");
  const lead = {
    _id: "lead-1",
    name: "Test Farm",
    status: "new_lead",
    type: "farm",
    contactEmail: "",
    socialLinks: {},
    nextFollowUpAt: undefined,
    source: "manual",
    clusterId: undefined,
  };
  assert.equal(matchesFilters(lead, { now: 1000 }), true);
});

test("matchesFilters filters by status", () => {
  const { matchesFilters } = loadTsModule("convex/lib/leadsList.ts");
  const lead = {
    _id: "lead-1",
    name: "Test Farm",
    status: "enriched",
    type: "farm",
    contactEmail: "",
    socialLinks: {},
  };
  assert.equal(matchesFilters(lead, { status: "enriched", now: 1000 }), true);
  assert.equal(matchesFilters(lead, { status: "new_lead", now: 1000 }), false);
});

test("matchesFilters filters by type", () => {
  const { matchesFilters } = loadTsModule("convex/lib/leadsList.ts");
  const lead = {
    _id: "lead-1",
    name: "Test Farm",
    status: "new_lead",
    type: "farm",
    contactEmail: "",
    socialLinks: {},
  };
  assert.equal(matchesFilters(lead, { type: "farm", now: 1000 }), true);
  assert.equal(matchesFilters(lead, { type: "farmers_market", now: 1000 }), false);
});

test("matchesFilters filters by hasEmail", () => {
  const { matchesFilters } = loadTsModule("convex/lib/leadsList.ts");
  const withEmail = {
    _id: "lead-1",
    name: "Test Farm",
    status: "new_lead",
    type: "farm",
    contactEmail: "owner@example.com",
    socialLinks: {},
  };
  const withoutEmail = {
    _id: "lead-2",
    name: "Test Farm 2",
    status: "new_lead",
    type: "farm",
    contactEmail: "",
    socialLinks: {},
  };
  assert.equal(matchesFilters(withEmail, { hasEmail: true, now: 1000 }), true);
  assert.equal(matchesFilters(withoutEmail, { hasEmail: true, now: 1000 }), false);
});
