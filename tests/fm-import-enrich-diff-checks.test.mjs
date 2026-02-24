import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adminDirPath = path.resolve("../fruitland-market/packages/backend/convex/adminDirectory.ts");
const source = fs.readFileSync(adminDirPath, "utf8");

// Extract the enrich block (after "Enrich unclaimed profile" comment, before "Update or create location row")
const enrichBlock = source.match(
  /── Enrich unclaimed profile ──[\s\S]*?await ctx\.db\.patch\(existing\._id, patch\)/
)?.[0] ?? "";

test("enrich block exists", () => {
  assert.ok(enrichBlock.length > 0, "should find the enrich unclaimed profile block");
});

test("enrich block has imagePrompt diff check", () => {
  assert.match(
    enrichBlock,
    /if \(row\.imagePrompt && row\.imagePrompt !== existing\.imagePrompt\)\s*\{\s*patch\.imagePrompt = row\.imagePrompt;/,
    "enrich block should check row.imagePrompt !== existing.imagePrompt before patching"
  );
});

test("enrich block has categories diff check with JSON.stringify", () => {
  assert.match(
    enrichBlock,
    /validCategories\.length > 0 &&\s*JSON\.stringify\(validCategories\) !== JSON\.stringify\(existing\.categories\)/,
    "enrich block should compare validCategories via JSON.stringify before patching"
  );
});

test("enrich block searchText rebuild includes categories via categoryAndProductSearchTerms", () => {
  // The searchText array in the enrich block should use categoryAndProductSearchTerms
  assert.match(
    enrichBlock,
    /patch\.searchText = \[[\s\S]*?categoryAndProductSearchTerms\(patchedCategories,\s*patchedProducts\)[\s\S]*?\]\s*\n\s*\.filter\(Boolean\)\s*\n\s*\.join\(" "\)/,
    "enrich searchText rebuild should include categoryAndProductSearchTerms(patchedCategories, patchedProducts)"
  );
});

test("enrich block patchedCategories variable uses patched or existing categories", () => {
  // The patchedCategories variable should fall back to existing.categories
  assert.match(
    enrichBlock,
    /const patchedCategories = \(patch\.categories as string\[\] \| undefined\)\s*\?\?\s*\n?\s*existing\.categories\s*\?\?\s*\n?\s*\[\]/,
    "patchedCategories variable should use patch.categories ?? existing.categories ?? []"
  );
});

test("imagePrompt diff check appears before categories diff check in enrich block", () => {
  const imagePromptIdx = enrichBlock.indexOf("patch.imagePrompt = row.imagePrompt");
  const categoriesIdx = enrichBlock.indexOf("patch.categories = validCategories");
  assert.ok(imagePromptIdx > -1, "imagePrompt patch should exist in enrich block");
  assert.ok(categoriesIdx > -1, "categories patch should exist in enrich block");
  assert.ok(
    categoriesIdx > imagePromptIdx,
    "categories patch should appear after imagePrompt patch"
  );
});
