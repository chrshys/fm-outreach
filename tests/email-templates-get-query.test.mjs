import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/emailTemplates.ts", "utf8");

test("exports get as a public query", () => {
  assert.match(source, /export\s+const\s+get\s*=\s*query\(/);
});

test("get query accepts an emailTemplates id arg", () => {
  assert.match(source, /id:\s*v\.id\("emailTemplates"\)/);
});

test("get query fetches from db by id", () => {
  assert.match(source, /ctx\.db\.get\(args\.id\)/);
});
