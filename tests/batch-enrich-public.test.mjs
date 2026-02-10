import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "convex/enrichment/batchEnrichPublic.ts",
  "utf8",
);

test("batchEnrich is exported as a public action", () => {
  assert.match(source, /export\s+const\s+batchEnrich\s*=\s*action\(/);
});

test("action accepts leadIds array and optional force args", () => {
  assert.match(source, /leadIds:\s*v\.array\(v\.id\("leads"\)\)/);
  assert.match(source, /force:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("delegates to internal batchEnrichLeads action", () => {
  assert.match(source, /ctx\.runAction\(/);
  assert.match(source, /internal\.enrichment\.batchEnrich\.batchEnrichLeads/);
});

test("passes leadIds and force args through", () => {
  assert.match(source, /leadIds:\s*args\.leadIds/);
  assert.match(source, /force:\s*args\.force/);
});

test("imports action from generated server", () => {
  assert.match(source, /import.*action.*from.*_generated\/server/);
});

test("imports internal from generated api", () => {
  assert.match(source, /import.*internal.*from.*_generated\/api/);
});
