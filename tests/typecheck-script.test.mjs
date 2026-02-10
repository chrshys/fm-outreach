import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

test("typecheck script runs TypeScript without emitting files", () => {
  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit");
});
