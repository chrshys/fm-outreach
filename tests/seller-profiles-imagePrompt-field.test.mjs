import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const schemaPath = path.resolve("../fruitland-market/packages/backend/convex/schema.ts");
const schemaSource = fs.readFileSync(schemaPath, "utf8");

test("profiles table includes imagePrompt field", () => {
  // imagePrompt should be an optional string field in profiles
  assert.match(
    schemaSource,
    /profiles:\s*defineTable\(\{[\s\S]*?imagePrompt:\s*v\.optional\(v\.string\(\)\)/,
    "profiles should have imagePrompt: v.optional(v.string())"
  );
});

test("imagePrompt field appears after bio field in profiles", () => {
  const bioIndex = schemaSource.indexOf("bio: v.optional(v.string())");
  const imagePromptIndex = schemaSource.indexOf("imagePrompt: v.optional(v.string())");
  assert.ok(bioIndex > -1, "bio field should exist");
  assert.ok(imagePromptIndex > -1, "imagePrompt field should exist");
  assert.ok(
    imagePromptIndex > bioIndex,
    "imagePrompt should appear after bio in the schema"
  );
});
