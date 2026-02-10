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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-seed-mapping-"));
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`);
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("seed csv columns map to lead fields for farms and markets", () => {
  const { parseCsv } = loadTsModule("convex/lib/csvParser.ts");
  const { buildImportedLead } = loadTsModule("convex/seeds/importLeadsMapper.ts");

  const farmsRows = parseCsv(fs.readFileSync("data/farms.csv", "utf8"));
  const marketsRows = parseCsv(fs.readFileSync("data/farmers-markets.csv", "utf8"));

  const options = {
    filename: "seed.csv",
    now: 1700000000000,
    importDate: "2026-02-09",
  };

  const firstFarm = farmsRows[0];
  const farmLead = buildImportedLead(firstFarm, options);
  assert.equal(farmLead.name, firstFarm["Name"]);
  assert.equal(farmLead.contactEmail, firstFarm["Email address"]);
  assert.equal(farmLead.website, firstFarm["URL"]);
  assert.equal(farmLead.contactPhone, firstFarm["Phone"]);
  assert.equal(farmLead.address, firstFarm["Address"]);
  assert.equal(farmLead.city, firstFarm["Town / City"]);

  const firstMarket = marketsRows[0];
  const marketLead = buildImportedLead(firstMarket, options);
  assert.equal(marketLead.name, firstMarket["Name"]);
  assert.equal(marketLead.type, "farmers_market");
  assert.equal(marketLead.address, firstMarket["Address"]);
  assert.equal(marketLead.city, firstMarket["Town / City"]);
});

test("all farmers-market category rows map to farmers_market lead type", () => {
  const { parseCsv } = loadTsModule("convex/lib/csvParser.ts");
  const { buildImportedLead } = loadTsModule("convex/seeds/importLeadsMapper.ts");

  const marketsRows = parseCsv(fs.readFileSync("data/farmers-markets.csv", "utf8"));
  const options = {
    filename: "farmers-markets.csv",
    now: 1700000000000,
    importDate: "2026-02-09",
  };

  const marketCategoryRows = marketsRows.filter((row) =>
    /farmer[’']s market/i.test(row["Categories"] ?? ""),
  );

  assert.ok(marketCategoryRows.length > 0);

  for (const row of marketCategoryRows) {
    const lead = buildImportedLead(row, options);
    assert.equal(lead.type, "farmers_market");
  }
});

test("leads typed farmers_market always have Categories containing Farmer's Market", () => {
  const { parseCsv } = loadTsModule("convex/lib/csvParser.ts");
  const { buildImportedLead } = loadTsModule("convex/seeds/importLeadsMapper.ts");

  const rows = [
    ...parseCsv(fs.readFileSync("data/farms.csv", "utf8")),
    ...parseCsv(fs.readFileSync("data/farmers-markets.csv", "utf8")),
  ];
  const options = {
    filename: "seed.csv",
    now: 1700000000000,
    importDate: "2026-02-09",
  };

  for (const row of rows) {
    const lead = buildImportedLead(row, options);
    if (lead.type !== "farmers_market") {
      continue;
    }

    assert.match(row["Categories"] ?? "", /farmer[’']s market/i);
  }
});
