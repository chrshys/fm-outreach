import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adminDirPath = path.resolve("../fruitland-market/packages/backend/convex/adminDirectory.ts");
const source = fs.readFileSync(adminDirPath, "utf8");

test("importCsvRows new profile insert includes imagePrompt field", () => {
  assert.match(
    source,
    /ctx\.db\.insert\("sellerProfiles",\s*\{[\s\S]*?imagePrompt:\s*row\.imagePrompt/,
    "db.insert('sellerProfiles', ...) should include imagePrompt: row.imagePrompt"
  );
});

test("importCsvRows new profile insert includes categories field", () => {
  assert.match(
    source,
    /ctx\.db\.insert\("sellerProfiles",\s*\{[\s\S]*?categories:\s*row\.categories/,
    "db.insert('sellerProfiles', ...) should include categories: row.categories"
  );
});

test("importCsvRows new profile searchText includes categories", () => {
  // The searchText builder array should contain a categories join expression
  assert.match(
    source,
    /const searchText = \[[\s\S]*?\(row\.categories \?\? \[\]\)\.join\(" "\)[\s\S]*?\][\s\S]*?\.filter\(Boolean\)[\s\S]*?\.join\(" "\)/,
    "searchText builder should include (row.categories ?? []).join(\" \")"
  );
});

test("imagePrompt appears before categories in new profile insert", () => {
  const insertMatch = source.match(
    /ctx\.db\.insert\("sellerProfiles",\s*\{([\s\S]*?)\}\)/
  );
  assert.ok(insertMatch, "should find sellerProfiles insert block");
  const insertBody = insertMatch[1];
  const imagePromptIdx = insertBody.indexOf("imagePrompt: row.imagePrompt");
  const categoriesIdx = insertBody.indexOf("categories: row.categories");
  assert.ok(imagePromptIdx > -1, "imagePrompt should exist in insert");
  assert.ok(categoriesIdx > -1, "categories should exist in insert");
  assert.ok(
    categoriesIdx > imagePromptIdx,
    "categories should appear after imagePrompt in insert"
  );
});

test("categories in searchText builder comes after products", () => {
  const searchTextMatch = source.match(
    /const searchText = \[([\s\S]*?)\]\s*\n\s*\.filter/
  );
  assert.ok(searchTextMatch, "should find searchText array");
  const arrayBody = searchTextMatch[1];
  const productsIdx = arrayBody.indexOf("(row.products ?? []).join");
  const categoriesIdx = arrayBody.indexOf("(row.categories ?? []).join");
  assert.ok(productsIdx > -1, "products join should exist in searchText");
  assert.ok(categoriesIdx > -1, "categories join should exist in searchText");
  assert.ok(
    categoriesIdx > productsIdx,
    "categories should appear after products in searchText"
  );
});
