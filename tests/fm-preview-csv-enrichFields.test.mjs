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
