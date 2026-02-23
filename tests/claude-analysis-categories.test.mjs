import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/claudeAnalysis.ts", "utf8");

// --- EXTRACTION_PROMPT uses FM's 11-category taxonomy ---

test("EXTRACTION_PROMPT includes all 11 FM category keys with product examples", () => {
  const categories = [
    { key: "produce", example: "vegetables" },
    { key: "eggs_dairy", example: "eggs" },
    { key: "meat_poultry", example: "beef" },
    { key: "seafood", example: "crab" },
    { key: "baked_goods", example: "bread" },
    { key: "pantry", example: "honey" },
    { key: "plants", example: "seedlings" },
    { key: "handmade", example: "soap" },
    { key: "wellness", example: "herbal tea" },
    { key: "beverages", example: "juice" },
    { key: "prepared", example: "ready-to-eat" },
  ];

  for (const { key, example } of categories) {
    assert.ok(
      source.includes(`"${key}"`),
      `EXTRACTION_PROMPT should include category "${key}"`,
    );
    assert.ok(
      source.includes(example),
      `EXTRACTION_PROMPT should include product example "${example}" for category "${key}"`,
    );
  }
});

test("EXTRACTION_PROMPT does not list legacy category keys as valid options", () => {
  // Extract just the prompt portion to avoid matching variable names etc.
  const promptMatch = source.match(/const EXTRACTION_PROMPT = `([\s\S]*?)`;/);
  assert.ok(promptMatch, "EXTRACTION_PROMPT should exist");
  const prompt = promptMatch[1];

  // The old inline category list pattern should be gone
  assert.ok(
    !prompt.includes('one of: "produce", "dairy"'),
    "Should not have old inline category list",
  );

  // "value-added" should not appear anywhere in the prompt
  assert.ok(
    !prompt.includes("value-added"),
    "Should not include legacy 'value-added' category",
  );

  // The new prompt uses a multi-line category list with dashes
  assert.ok(
    prompt.includes('- "produce"'),
    "Should use multi-line category format",
  );
});

test("EXTRACTION_PROMPT instructs LLM not to use 'other' category", () => {
  assert.ok(
    source.includes('Do not use "other"'),
    "Prompt should instruct LLM not to use 'other'",
  );
});

// --- parseStructuredProducts uses normalizeCategoryKey ---

test("claudeAnalysis imports normalizeCategoryKey from categories", () => {
  assert.match(
    source,
    /import\s*\{[^}]*normalizeCategoryKey[^}]*\}\s*from\s*["']\.\/categories["']/,
  );
});

test("parseStructuredProducts calls normalizeCategoryKey on raw category", () => {
  assert.match(source, /normalizeCategoryKey\(rawCategory\)/);
});

test("parseStructuredProducts filters out products with empty category after normalization", () => {
  assert.match(source, /item\.category\.length\s*>\s*0/);
});
