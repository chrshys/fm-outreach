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
