import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

const COMPILER_OPTIONS = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
};

/**
 * Transpile categories.ts + the parseStructuredProducts function extracted
 * from the given enrichment file into one runnable CommonJS module.
 */
function loadParser(enrichmentFile) {
  const catSource = fs.readFileSync(
    "convex/enrichment/categories.ts",
    "utf8",
  );
  const catCode = ts.transpileModule(catSource, {
    compilerOptions: COMPILER_OPTIONS,
    fileName: "categories.ts",
  }).outputText;

  const enrichSource = fs.readFileSync(enrichmentFile, "utf8");
  const funcMatch = enrichSource.match(
    /function parseStructuredProducts\([\s\S]*?\n\}/,
  );
  assert.ok(funcMatch, `parseStructuredProducts not found in ${enrichmentFile}`);

  const funcCode = ts.transpileModule(funcMatch[0], {
    compilerOptions: COMPILER_OPTIONS,
    fileName: "parser.ts",
  }).outputText;

  // Combine: categories exports normalizeCategoryKey into module scope,
  // then the parser function uses it.
  const combined = [
    "// --- categories.ts (inlined) ---",
    catCode,
    "// --- parseStructuredProducts (extracted) ---",
    funcCode,
    "module.exports.parseStructuredProducts = parseStructuredProducts;",
  ].join("\n");

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "fm-parse-products-"),
  );
  const modulePath = path.join(tempDir, "combined.cjs");
  fs.writeFileSync(modulePath, combined, "utf8");

  const requireFromTest = createRequire(import.meta.url);
  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// --- Test both sonarEnrich.ts and claudeAnalysis.ts ---

for (const file of [
  "convex/enrichment/sonarEnrich.ts",
  "convex/enrichment/claudeAnalysis.ts",
]) {
  const label = path.basename(file, ".ts");

  test(`${label}: valid categories pass through unchanged`, () => {
    const { parseStructuredProducts } = loadParser(file);
    const result = parseStructuredProducts([
      { name: "organic tomatoes", category: "produce" },
      { name: "raw honey", category: "pantry" },
      { name: "blue crab", category: "seafood" },
    ]);
    assert.deepEqual(result, [
      { name: "organic tomatoes", category: "produce" },
      { name: "raw honey", category: "pantry" },
      { name: "blue crab", category: "seafood" },
    ]);
  });

  test(`${label}: legacy categories are normalized via normalizeCategoryKey`, () => {
    const { parseStructuredProducts } = loadParser(file);
    const result = parseStructuredProducts([
      { name: "raw milk", category: "dairy" },
      { name: "free-range eggs", category: "eggs" },
      { name: "ground beef", category: "meat" },
      { name: "wildflower honey", category: "honey" },
      { name: "strawberry jam", category: "preserves" },
      { name: "sunflowers", category: "flowers" },
      { name: "apple trees", category: "nursery" },
    ]);
    assert.deepEqual(result, [
      { name: "raw milk", category: "eggs_dairy" },
      { name: "free-range eggs", category: "eggs_dairy" },
      { name: "ground beef", category: "meat_poultry" },
      { name: "wildflower honey", category: "pantry" },
      { name: "strawberry jam", category: "pantry" },
      { name: "sunflowers", category: "plants" },
      { name: "apple trees", category: "plants" },
    ]);
  });

  test(`${label}: unknown categories are dropped (product removed)`, () => {
    const { parseStructuredProducts } = loadParser(file);
    const result = parseStructuredProducts([
      { name: "good product", category: "produce" },
      { name: "mystery item", category: "random_garbage" },
      { name: "another mystery", category: "value-added" },
    ]);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], { name: "good product", category: "produce" });
  });

  test(`${label}: products with empty name are dropped`, () => {
    const { parseStructuredProducts } = loadParser(file);
    const result = parseStructuredProducts([
      { name: "", category: "produce" },
      { name: "valid", category: "produce" },
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "valid");
  });

  test(`${label}: products with empty category are dropped`, () => {
    const { parseStructuredProducts } = loadParser(file);
    const result = parseStructuredProducts([
      { name: "something", category: "" },
      { name: "valid", category: "pantry" },
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "valid");
  });

  test(`${label}: non-array input returns empty array`, () => {
    const { parseStructuredProducts } = loadParser(file);
    assert.deepEqual(parseStructuredProducts(null), []);
    assert.deepEqual(parseStructuredProducts(undefined), []);
    assert.deepEqual(parseStructuredProducts("not an array"), []);
    assert.deepEqual(parseStructuredProducts(42), []);
    assert.deepEqual(parseStructuredProducts({}), []);
  });

  test(`${label}: malformed items are skipped`, () => {
    const { parseStructuredProducts } = loadParser(file);
    const result = parseStructuredProducts([
      null,
      "just a string",
      42,
      { name: "valid", category: "produce" },
      { name: 123, category: "produce" },
      { name: "no-cat" },
    ]);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], { name: "valid", category: "produce" });
  });

  test(`${label}: category normalization is case-insensitive`, () => {
    const { parseStructuredProducts } = loadParser(file);
    const result = parseStructuredProducts([
      { name: "tomatoes", category: "PRODUCE" },
      { name: "bread", category: "Baked_Goods" },
    ]);
    assert.deepEqual(result, [
      { name: "tomatoes", category: "produce" },
      { name: "bread", category: "baked_goods" },
    ]);
  });
}
