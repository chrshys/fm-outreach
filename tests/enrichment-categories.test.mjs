import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadModule() {
  const source = fs.readFileSync(
    "convex/enrichment/categories.ts",
    "utf8",
  );
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "categories.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-categories-"));
  const modulePath = path.join(tempDir, "categories.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("VALID_CATEGORIES has exactly 11 entries", () => {
  const { VALID_CATEGORIES } = loadModule();
  assert.equal(VALID_CATEGORIES.length, 11);
});

test("VALID_CATEGORIES contains all expected keys", () => {
  const { VALID_CATEGORIES } = loadModule();
  const expected = [
    "produce",
    "eggs_dairy",
    "meat_poultry",
    "seafood",
    "baked_goods",
    "pantry",
    "plants",
    "handmade",
    "wellness",
    "beverages",
    "prepared",
  ];
  assert.deepEqual([...VALID_CATEGORIES], expected);
});

test("normalizeCategoryKey returns valid key for direct match", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("produce"), "produce");
  assert.equal(normalizeCategoryKey("eggs_dairy"), "eggs_dairy");
  assert.equal(normalizeCategoryKey("prepared"), "prepared");
});

test("normalizeCategoryKey is case-insensitive", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("Produce"), "produce");
  assert.equal(normalizeCategoryKey("PANTRY"), "pantry");
  assert.equal(normalizeCategoryKey("Eggs_Dairy"), "eggs_dairy");
});

test("normalizeCategoryKey trims whitespace", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("  produce  "), "produce");
  assert.equal(normalizeCategoryKey(" pantry\t"), "pantry");
});

test("normalizeCategoryKey maps legacy dairy to eggs_dairy", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("dairy"), "eggs_dairy");
});

test("normalizeCategoryKey maps legacy eggs to eggs_dairy", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("eggs"), "eggs_dairy");
});

test("normalizeCategoryKey maps legacy meat to meat_poultry", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("meat"), "meat_poultry");
});

test("normalizeCategoryKey maps legacy honey to pantry", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("honey"), "pantry");
});

test("normalizeCategoryKey maps legacy 'baked goods' to baked_goods", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("baked goods"), "baked_goods");
});

test("normalizeCategoryKey maps legacy preserves to pantry", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("preserves"), "pantry");
});

test("normalizeCategoryKey maps legacy flowers to plants", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("flowers"), "plants");
});

test("normalizeCategoryKey maps legacy nursery to plants", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("nursery"), "plants");
});

test("normalizeCategoryKey drops value-added (returns undefined)", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("value-added"), undefined);
});

test("normalizeCategoryKey drops other (returns undefined)", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("other"), undefined);
});

test("normalizeCategoryKey returns undefined for unknown input", () => {
  const { normalizeCategoryKey } = loadModule();
  assert.equal(normalizeCategoryKey("bananas"), undefined);
  assert.equal(normalizeCategoryKey(""), undefined);
});

test("LEGACY_CATEGORY_MAP has expected entries", () => {
  const { LEGACY_CATEGORY_MAP } = loadModule();
  assert.equal(LEGACY_CATEGORY_MAP["dairy"], "eggs_dairy");
  assert.equal(LEGACY_CATEGORY_MAP["eggs"], "eggs_dairy");
  assert.equal(LEGACY_CATEGORY_MAP["meat"], "meat_poultry");
  assert.equal(LEGACY_CATEGORY_MAP["honey"], "pantry");
  assert.equal(LEGACY_CATEGORY_MAP["baked goods"], "baked_goods");
  assert.equal(LEGACY_CATEGORY_MAP["preserves"], "pantry");
  assert.equal(LEGACY_CATEGORY_MAP["flowers"], "plants");
  assert.equal(LEGACY_CATEGORY_MAP["nursery"], "plants");
  assert.equal(LEGACY_CATEGORY_MAP["value-added"], undefined);
  assert.equal(LEGACY_CATEGORY_MAP["other"], undefined);
});

test("direct match takes priority over legacy map", () => {
  const { normalizeCategoryKey, VALID_CATEGORIES } = loadModule();
  for (const key of VALID_CATEGORIES) {
    assert.equal(normalizeCategoryKey(key), key);
  }
});
