import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadModule() {
  const source = fs.readFileSync("src/lib/csv-export.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "csv-export.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-csv-export-"));
  const modulePath = path.join(tempDir, "csv-export.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("leadsToCSV produces correct header row", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([]);
  const header = csv.split("\n")[0];
  assert.equal(
    header,
    "name,type,farmDescription,contactPhone,address,city,latitude,longitude,placeId,website,instagram,facebook,products"
  );
});

test("leadsToCSV outputs correct values for a complete lead", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Green Acres",
      type: "farm",
      farmDescription: "Organic produce",
      contactPhone: "555-0100",
      address: "123 Farm Rd",
      city: "Guelph",
      latitude: 43.55,
      longitude: -80.25,
      placeId: "ChIJ123",
      website: "https://greenacres.com",
      socialLinks: {
        instagram: "greenacres_ig",
        facebook: "greenacres_fb",
      },
      products: ["apples", "pears"],
    },
  ]);
  const lines = csv.split("\n");
  assert.equal(lines.length, 2);
  assert.equal(
    lines[1],
    'Green Acres,farm,Organic produce,555-0100,123 Farm Rd,Guelph,43.55,-80.25,ChIJ123,https://greenacres.com,greenacres_ig,greenacres_fb,"apples, pears"'
  );
});

test("leadsToCSV uses empty strings for null/undefined fields", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Bare Farm",
      type: "farm",
    },
  ]);
  const lines = csv.split("\n");
  assert.equal(lines[1], "Bare Farm,farm,,,,,,,,,,,");
});

test("leadsToCSV escapes fields containing commas", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Farm, Inc.",
      type: "farm",
      address: "123 Main St, Suite 4",
    },
  ]);
  const lines = csv.split("\n");
  assert.ok(lines[1].startsWith('"Farm, Inc.",farm,'));
  assert.ok(lines[1].includes('"123 Main St, Suite 4"'));
});

test("leadsToCSV escapes fields containing double quotes", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: 'The "Best" Farm',
      type: "farm",
    },
  ]);
  const lines = csv.split("\n");
  assert.ok(lines[1].startsWith('"The ""Best"" Farm",farm'));
});

test("leadsToCSV escapes fields containing newlines", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Normal Farm",
      type: "farm",
      farmDescription: "Line one\nLine two",
    },
  ]);
  const dataRows = csv.split("\n").slice(1).join("\n");
  assert.ok(dataRows.includes('"Line one\nLine two"'));
});

test("leadsToCSV flattens socialLinks to top-level columns", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Social Farm",
      type: "farm",
      socialLinks: { instagram: "ig_handle", facebook: "fb_page" },
    },
  ]);
  const lines = csv.split("\n");
  // instagram and facebook should be individual columns, not nested
  assert.ok(lines[1].includes("ig_handle"));
  assert.ok(lines[1].includes("fb_page"));
  // socialLinks should not appear as "[object Object]"
  assert.ok(!lines[1].includes("[object Object]"));
});

test("leadsToCSV joins products array with comma-space separator", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Produce Farm",
      type: "farm",
      products: ["tomatoes", "cucumbers", "lettuce"],
    },
  ]);
  const lines = csv.split("\n");
  assert.ok(lines[1].includes('"tomatoes, cucumbers, lettuce"'));
});

test("downloadCSV function is exported", () => {
  const mod = loadModule();
  assert.equal(typeof mod.downloadCSV, "function");
});

test("csv-export source uses RFC 4180 quoting for commas, quotes, and newlines", () => {
  const source = fs.readFileSync("src/lib/csv-export.ts", "utf8");
  // Checks that escapeField handles all three RFC 4180 special characters
  assert.ok(source.includes('","'), "should check for comma");
  assert.ok(source.includes('"'), "should check for double quote");
  assert.ok(source.includes('"\\n"') || source.includes("\\n"), "should check for newline");
  // Checks that double quotes are escaped by doubling
  assert.ok(source.includes('""'), "should escape quotes by doubling");
});

test("leads page imports csv-export utilities", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  assert.ok(
    source.includes('from "@/lib/csv-export"'),
    "should import from csv-export module"
  );
  assert.ok(source.includes("leadsToCSV"), "should import leadsToCSV");
  assert.ok(source.includes("downloadCSV"), "should import downloadCSV");
});

test("leads page has Export CSV button", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  assert.ok(source.includes("Export CSV"), "should have Export CSV button text");
  assert.ok(source.includes("isExporting"), "should track exporting state");
  assert.ok(source.includes("handleExportCSV"), "should have export handler");
  assert.ok(
    source.includes("listForExport"),
    "should call listForExport query"
  );
});
