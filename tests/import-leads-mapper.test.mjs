import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadMapper() {
  const source = fs.readFileSync("convex/seeds/importLeadsMapper.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "importLeadsMapper.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-import-leads-mapper-"));
  const modulePath = path.join(tempDir, "importLeadsMapper.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("deriveLeadType maps Farmer's Market categories to farmers_market", () => {
  const { deriveLeadType } = loadMapper();

  assert.equal(deriveLeadType("Produce, Farmer's Market"), "farmers_market");
  assert.equal(deriveLeadType("farmer's market"), "farmers_market");
  assert.equal(deriveLeadType("Farmer’s Market"), "farmers_market");
});

test("deriveLeadType defaults to farm when category does not include Farmer's Market", () => {
  const { deriveLeadType } = loadMapper();

  assert.equal(deriveLeadType("Organic Farm"), "farm");
  assert.equal(deriveLeadType("Farmers Market"), "farm");
  assert.equal(deriveLeadType(""), "farm");
});

test("buildImportedLead maps all requested columns and defaults", () => {
  const { buildImportedLead } = loadMapper();

  const row = {
    Name: "  Apple Hill Farm  ",
    "Email address": "hello@applehill.example",
    URL: "https://applehill.example",
    Instagram: "https://instagram.com/applehill",
    Phone: "555-1212",
    Address: "123 Orchard Rd",
    "Town / City": "St. Catharines",
    Hours: "Sat 9-2",
    Categories: "Farm, Farmer's Market",
  };

  const lead = buildImportedLead(row, {
    filename: "farms.csv",
    now: 1700000000000,
    importDate: "2026-02-09",
  });

  assert.deepEqual(lead, {
    name: "Apple Hill Farm",
    type: "farmers_market",
    contactEmail: "hello@applehill.example",
    website: "https://applehill.example",
    contactPhone: "555-1212",
    address: "123 Orchard Rd",
    city: "St. Catharines",
    notes: "Sat 9-2",
    socialLinks: {
      instagram: "https://instagram.com/applehill",
    },
    region: "Niagara",
    source: "spreadsheet_import",
    status: "new_lead",
    province: "ON",
    consentSource: "spreadsheet_import - farms.csv - 2026-02-09",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    followUpCount: 0,
  });
});

test("buildImportedLead omits optional fields when source columns are blank", () => {
  const { buildImportedLead } = loadMapper();

  const lead = buildImportedLead(
    {
      Name: "No Contact Farm",
      "Email address": "",
      URL: "",
      Instagram: "",
      Phone: "",
      Address: "456 Country Lane",
      "Town / City": "Lincoln",
      Hours: "",
      Categories: "Farm",
    },
    {
      filename: "farms.csv",
      now: 1700000000000,
      importDate: "2026-02-09",
    },
  );

  assert.equal(lead.name, "No Contact Farm");
  assert.equal(lead.type, "farm");
  assert.equal(lead.address, "456 Country Lane");
  assert.equal(lead.city, "Lincoln");
  assert.equal(lead.province, "ON");
  assert.equal(lead.source, "spreadsheet_import");
  assert.equal(lead.status, "new_lead");
  assert.equal(lead.followUpCount, 0);
  assert.ok(!("contactEmail" in lead));
  assert.ok(!("website" in lead));
  assert.ok(!("contactPhone" in lead));
  assert.ok(!("socialLinks" in lead));
  assert.ok(!("notes" in lead));
});
