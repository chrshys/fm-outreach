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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-leads-search-"));
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`);
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createLead(index, overrides = {}) {
  return {
    _id: `lead-${index}`,
    name: `Lead ${String(index).padStart(2, "0")}`,
    city: `City ${String(index).padStart(2, "0")}`,
    status: "new_lead",
    type: "farm",
    source: "manual",
    updatedAt: index,
    followUpCount: 0,
    createdAt: index,
    ...overrides,
  };
}

test("searchLeads matches name and city prefixes case-insensitively", () => {
  const { searchLeads } = loadTsModule("convex/lib/searchLeads.ts");

  const leads = [
    createLead(1, { name: "Apple Acres", city: "Fruitland" }),
    createLead(2, { name: "Berry Barn", city: "Albion" }),
    createLead(3, { name: "Cedar Grove", city: "Framingham" }),
  ];

  const nameResults = searchLeads(leads, "app");
  assert.deepEqual(
    nameResults.map((lead) => lead._id),
    ["lead-1"],
  );

  const cityResults = searchLeads(leads, "fr");
  assert.deepEqual(
    cityResults.map((lead) => lead._id),
    ["lead-1", "lead-3"],
  );
});

test("searchLeads returns an empty list for blank text", () => {
  const { searchLeads } = loadTsModule("convex/lib/searchLeads.ts");
  const leads = [createLead(1, { name: "Apple Acres", city: "Fruitland" })];

  assert.deepEqual(searchLeads(leads, "   "), []);
});

test("searchLeads caps results at 50", () => {
  const { searchLeads } = loadTsModule("convex/lib/searchLeads.ts");
  const leads = Array.from({ length: 80 }, (_, i) =>
    createLead(i + 1, {
      name: `Farm ${String(i + 1).padStart(2, "0")}`,
      city: "Fruitland",
    }),
  );

  const results = searchLeads(leads, "farm");
  assert.equal(results.length, 50);
});

test("searchLeads matches Niagara when it appears anywhere in lead name or city", () => {
  const { searchLeads } = loadTsModule("convex/lib/searchLeads.ts");
  const leads = [
    createLead(1, { name: "Niagara Orchard Co.", city: "Hamilton" }),
    createLead(2, { name: "South Shore Farms", city: "Niagara-on-the-Lake" }),
    createLead(3, { name: "Golden Acres", city: "Welland" }),
  ];

  const results = searchLeads(leads, "Niagara");
  assert.deepEqual(
    results.map((lead) => lead._id),
    ["lead-1", "lead-2"],
  );
});

test("convex leads search query is exported with text arg and limit 50", () => {
  const source = fs.readFileSync("convex/leads.ts", "utf8");

  assert.match(source, /export\s+const\s+search\s*=\s*query\(/);
  assert.match(source, /text:\s*v\.string\(\)/);
  assert.match(source, /searchLeads\(allLeads,\s*args\.text,\s*50\)/);
});
