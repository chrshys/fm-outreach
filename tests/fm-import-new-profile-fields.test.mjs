import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adminDirPath = path.resolve("../fruitland-market/packages/backend/convex/adminDirectory.ts");
const source = fs.readFileSync(adminDirPath, "utf8");

test("importCsvRows new profile insert includes imagePrompt field", () => {
  assert.match(
    source,
    /ctx\.db\.insert\("profiles",\s*\{[\s\S]*?imagePrompt:\s*row\.imagePrompt/,
    "db.insert('profiles', ...) should include imagePrompt: row.imagePrompt"
  );
});

test("importCsvRows new profile insert includes categories field", () => {
  assert.match(
    source,
    /ctx\.db\.insert\("profiles",\s*\{[\s\S]*?categories:\s*validCategories/,
    "db.insert('profiles', ...) should include categories: validCategories"
  );
});

test("importCsvRows new profile searchText includes categories via categoryAndProductSearchTerms", () => {
  // The searchText builder should use categoryAndProductSearchTerms with validCategories
  assert.match(
    source,
    /const searchText = \[[\s\S]*?categoryAndProductSearchTerms\(validCategories,\s*row\.products\b[\s\S]*?\][\s\S]*?\.filter\(Boolean\)[\s\S]*?\.join\(" "\)/,
    "searchText builder should include categoryAndProductSearchTerms(validCategories, row.products)"
  );
});

test("imagePrompt appears before categories in new profile insert", () => {
  const insertMatch = source.match(
    /ctx\.db\.insert\("profiles",\s*\{([\s\S]*?)\}\)/
  );
  assert.ok(insertMatch, "should find profiles insert block");
  const insertBody = insertMatch[1];
  const imagePromptIdx = insertBody.indexOf("imagePrompt: row.imagePrompt");
  const categoriesIdx = insertBody.indexOf("categories:");
  assert.ok(imagePromptIdx > -1, "imagePrompt should exist in insert");
  assert.ok(categoriesIdx > -1, "categories should exist in insert");
  assert.ok(
    categoriesIdx > imagePromptIdx,
    "categories should appear after imagePrompt in insert"
  );
});

test("importCsvRows new profile insert includes hours field", () => {
  assert.match(
    source,
    /ctx\.db\.insert\("profiles",\s*\{[\s\S]*?hours:\s*row\.hours/,
    "db.insert('profiles', ...) should include hours: row.hours"
  );
});

test("hours appears after products in new profile insert", () => {
  const insertMatch = source.match(
    /ctx\.db\.insert\("profiles",\s*\{([\s\S]*?)\}\)/
  );
  assert.ok(insertMatch, "should find profiles insert block");
  const insertBody = insertMatch[1];
  const productsIdx = insertBody.indexOf("products:");
  const hoursIdx = insertBody.indexOf("hours: row.hours");
  assert.ok(productsIdx > -1, "products should exist in insert");
  assert.ok(hoursIdx > -1, "hours should exist in insert");
  assert.ok(
    hoursIdx > productsIdx,
    "hours should appear after products in insert"
  );
});

test("importCsvRows enrich block includes hours diff check", () => {
  assert.match(
    source,
    /row\.hours\s*&&\s*\n?\s*row\.hours\.length\s*>\s*0\s*&&\s*\n?\s*JSON\.stringify\(row\.hours\)\s*!==\s*JSON\.stringify\(existing\.hours\)/,
    "enrich block should check row.hours && row.hours.length > 0 && JSON.stringify(row.hours) !== JSON.stringify(existing.hours)"
  );
});

test("importCsvRows enrich block sets patch.hours from row.hours", () => {
  assert.match(
    source,
    /patch\.hours\s*=\s*row\.hours/,
    "enrich block should set patch.hours = row.hours"
  );
});

test("hours diff check appears after products diff check in enrich block", () => {
  // Scope to importCsvRows handler to avoid matching previewCsvImport
  const importBlock = source.match(
    /export const importCsvRows = mutation\(\{[\s\S]*?handler: async \(ctx, args\) => \{([\s\S]*?)\n  },\n\}\);/
  )?.[1] ?? "";
  assert.ok(importBlock.length > 0, "should find importCsvRows handler body");
  const productsCheckIdx = importBlock.indexOf("JSON.stringify(row.products) !== JSON.stringify(existing.products)");
  const hoursCheckIdx = importBlock.indexOf("JSON.stringify(row.hours) !== JSON.stringify(existing.hours)");
  assert.ok(productsCheckIdx > -1, "products diff check should exist in enrich block");
  assert.ok(hoursCheckIdx > -1, "hours diff check should exist in enrich block");
  assert.ok(
    hoursCheckIdx > productsCheckIdx,
    "hours diff check should appear after products diff check"
  );
});

test("importCsvRows new profile insert includes isSeasonal field", () => {
  assert.match(
    source,
    /ctx\.db\.insert\("profiles",\s*\{[\s\S]*?isSeasonal:\s*row\.isSeasonal/,
    "db.insert('profiles', ...) should include isSeasonal: row.isSeasonal"
  );
});

test("importCsvRows new profile insert includes seasonalNote field", () => {
  assert.match(
    source,
    /ctx\.db\.insert\("profiles",\s*\{[\s\S]*?seasonalNote:\s*row\.seasonalNote/,
    "db.insert('profiles', ...) should include seasonalNote: row.seasonalNote"
  );
});

test("importCsvRows enrich block includes isSeasonal diff check", () => {
  assert.match(
    source,
    /row\.isSeasonal != null && row\.isSeasonal !== existing\.isSeasonal/,
    "enrich block should check row.isSeasonal != null && row.isSeasonal !== existing.isSeasonal"
  );
});

test("importCsvRows enrich block includes seasonalNote diff check", () => {
  assert.match(
    source,
    /row\.seasonalNote && row\.seasonalNote !== existing\.seasonalNote/,
    "enrich block should check row.seasonalNote && row.seasonalNote !== existing.seasonalNote"
  );
});

test("categories in searchText builder comes after displayName", () => {
  const searchTextMatch = source.match(
    /const searchText = \[([\s\S]*?)\]\s*\n\s*\.filter/
  );
  assert.ok(searchTextMatch, "should find searchText array");
  const arrayBody = searchTextMatch[1];
  const displayNameIdx = arrayBody.indexOf("row.displayName");
  const categoriesIdx = arrayBody.indexOf("categoryAndProductSearchTerms");
  assert.ok(displayNameIdx > -1, "displayName should exist in searchText");
  assert.ok(categoriesIdx > -1, "categoryAndProductSearchTerms should exist in searchText");
  assert.ok(
    categoriesIdx > displayNameIdx,
    "categoryAndProductSearchTerms should appear after displayName in searchText"
  );
});
