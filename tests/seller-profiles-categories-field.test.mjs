import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const schemaPath = path.resolve("../fruitland-market/packages/backend/convex/schema.ts");
const schemaSource = fs.readFileSync(schemaPath, "utf8");

test("sellerProfiles table includes categories field", () => {
  assert.match(
    schemaSource,
    /sellerProfiles:\s*defineTable\(\{[\s\S]*?categories:\s*v\.optional\(v\.array\(v\.string\(\)\)\)/,
    "sellerProfiles should have categories: v.optional(v.array(v.string()))"
  );
});

test("categories field appears after imagePrompt field in sellerProfiles", () => {
  const imagePromptIndex = schemaSource.indexOf("imagePrompt: v.optional(v.string())");
  const categoriesIndex = schemaSource.indexOf("categories: v.optional(v.array(v.string()))");
  assert.ok(imagePromptIndex > -1, "imagePrompt field should exist");
  assert.ok(categoriesIndex > -1, "categories field should exist");
  assert.ok(
    categoriesIndex > imagePromptIndex,
    "categories should appear after imagePrompt in the schema"
  );
});
