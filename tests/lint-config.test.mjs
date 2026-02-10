import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const eslintConfig = fs.readFileSync("eslint.config.mjs", "utf8");

test("eslint ignores Convex generated files", () => {
  assert.match(eslintConfig, /"convex\/_generated\/\*\*"/);
});
