import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adminDirPath = path.resolve("../fruitland-market/packages/backend/convex/adminDirectory.ts");
const source = fs.readFileSync(adminDirPath, "utf8");

// Extract the previewCsvImport handler body
const previewBlock = source.match(
  /export const previewCsvImport = query\(\{[\s\S]*?handler: async \(ctx, args\) => \{([\s\S]*?)\n  },\n\}\);/
)?.[1] ?? "";

test("previewCsvImport handler block exists", () => {
  assert.ok(previewBlock.length > 0, "should find the previewCsvImport handler body");
});

test("previewCsvImport has imagePrompt diff check", () => {
  assert.match(
    previewBlock,
    /if \(row\.imagePrompt && row\.imagePrompt !== existing\.imagePrompt\)\s*\{\s*enrichFields\.push\("imagePrompt"\)/,
    "previewCsvImport should check row.imagePrompt !== existing.imagePrompt before pushing enrichField"
  );
});

test("previewCsvImport has categories diff check", () => {
  assert.match(
    previewBlock,
    /if \(row\.categories\?\.length\)\s*\{\s*enrichFields\.push\("categories"\)/,
    "previewCsvImport should check row.categories?.length before pushing enrichField"
  );
});

test("imagePrompt check appears before categories check in preview", () => {
  const imagePromptIdx = previewBlock.indexOf('enrichFields.push("imagePrompt")');
  const categoriesIdx = previewBlock.indexOf('enrichFields.push("categories")');
  assert.ok(imagePromptIdx > -1, "imagePrompt enrichField push should exist");
  assert.ok(categoriesIdx > -1, "categories enrichField push should exist");
  assert.ok(
    categoriesIdx > imagePromptIdx,
    "categories check should appear after imagePrompt check"
  );
});

test("imagePrompt and categories checks appear after profileType check", () => {
  const profileTypeIdx = previewBlock.indexOf('enrichFields.push("profileType")');
  const imagePromptIdx = previewBlock.indexOf('enrichFields.push("imagePrompt")');
  const categoriesIdx = previewBlock.indexOf('enrichFields.push("categories")');
  assert.ok(profileTypeIdx > -1, "profileType enrichField push should exist");
  assert.ok(
    imagePromptIdx > profileTypeIdx,
    "imagePrompt check should appear after profileType check"
  );
  assert.ok(
    categoriesIdx > profileTypeIdx,
    "categories check should appear after profileType check"
  );
});

test("previewCsvImport has hours diff check", () => {
  assert.match(
    previewBlock,
    /if \(row\.hours\?\.length && JSON\.stringify\(row\.hours\) !== JSON\.stringify\(existing\.hours\)\)\s*\{\s*enrichFields\.push\("hours"\)/,
    "previewCsvImport should check row.hours?.length and JSON.stringify diff before pushing enrichField"
  );
});

test("hours check appears after products check", () => {
  const productsIdx = previewBlock.indexOf('enrichFields.push("products")');
  const hoursIdx = previewBlock.indexOf('enrichFields.push("hours")');
  assert.ok(productsIdx > -1, "products enrichField push should exist");
  assert.ok(hoursIdx > -1, "hours enrichField push should exist");
  assert.ok(
    hoursIdx > productsIdx,
    "hours check should appear after products check"
  );
});

test("hours check appears before location check", () => {
  const hoursIdx = previewBlock.indexOf('enrichFields.push("hours")');
  const locationIdx = previewBlock.indexOf('enrichFields.push("location")');
  assert.ok(hoursIdx > -1, "hours enrichField push should exist");
  assert.ok(locationIdx > -1, "location enrichField push should exist");
  assert.ok(
    hoursIdx < locationIdx,
    "hours check should appear before location check"
  );
});

test("previewCsvImport has isSeasonal diff check", () => {
  assert.match(
    previewBlock,
    /if \(row\.isSeasonal != null && row\.isSeasonal !== existing\.isSeasonal\)\s*\{\s*enrichFields\.push\("isSeasonal"\)/,
    "previewCsvImport should check row.isSeasonal != null and diff before pushing enrichField"
  );
});

test("previewCsvImport has seasonalNote diff check", () => {
  assert.match(
    previewBlock,
    /if \(row\.seasonalNote && row\.seasonalNote !== existing\.seasonalNote\)\s*\{\s*enrichFields\.push\("seasonalNote"\)/,
    "previewCsvImport should check row.seasonalNote diff before pushing enrichField"
  );
});

test("isSeasonal check appears after hours check", () => {
  const hoursIdx = previewBlock.indexOf('enrichFields.push("hours")');
  const isSeasonalIdx = previewBlock.indexOf('enrichFields.push("isSeasonal")');
  assert.ok(hoursIdx > -1, "hours enrichField push should exist");
  assert.ok(isSeasonalIdx > -1, "isSeasonal enrichField push should exist");
  assert.ok(
    isSeasonalIdx > hoursIdx,
    "isSeasonal check should appear after hours check"
  );
});

test("seasonalNote check appears after isSeasonal check", () => {
  const isSeasonalIdx = previewBlock.indexOf('enrichFields.push("isSeasonal")');
  const seasonalNoteIdx = previewBlock.indexOf('enrichFields.push("seasonalNote")');
  assert.ok(isSeasonalIdx > -1, "isSeasonal enrichField push should exist");
  assert.ok(seasonalNoteIdx > -1, "seasonalNote enrichField push should exist");
  assert.ok(
    seasonalNoteIdx > isSeasonalIdx,
    "seasonalNote check should appear after isSeasonal check"
  );
});

test("seasonalNote check appears before location check", () => {
  const seasonalNoteIdx = previewBlock.indexOf('enrichFields.push("seasonalNote")');
  const locationIdx = previewBlock.indexOf('enrichFields.push("location")');
  assert.ok(seasonalNoteIdx > -1, "seasonalNote enrichField push should exist");
  assert.ok(locationIdx > -1, "location enrichField push should exist");
  assert.ok(
    seasonalNoteIdx < locationIdx,
    "seasonalNote check should appear before location check"
  );
});

test("imagePrompt and categories checks appear before location check", () => {
  const imagePromptIdx = previewBlock.indexOf('enrichFields.push("imagePrompt")');
  const categoriesIdx = previewBlock.indexOf('enrichFields.push("categories")');
  const locationIdx = previewBlock.indexOf('enrichFields.push("location")');
  assert.ok(locationIdx > -1, "location enrichField push should exist");
  assert.ok(
    imagePromptIdx < locationIdx,
    "imagePrompt check should appear before location check"
  );
  assert.ok(
    categoriesIdx < locationIdx,
    "categories check should appear before location check"
  );
});
