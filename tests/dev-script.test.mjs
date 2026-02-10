import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

test("dev script binds Next.js to localhost for sandbox-safe startup", () => {
  assert.equal(
    packageJson.scripts.dev,
    "next dev --hostname 127.0.0.1",
  );
});
