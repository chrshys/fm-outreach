import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/seeds/runSeed.ts", "utf8");

test("runSeed action accepts csv content and filenames for both imports", () => {
  assert.match(source, /export\s+const\s+runSeed\s*=\s*action\(/);
  assert.match(source, /farmsCsvContent:\s*v\.string\(\)/);
  assert.match(source, /marketsCsvContent:\s*v\.string\(\)/);
  assert.match(source, /farmsFilename:\s*v\.string\(\)/);
  assert.match(source, /marketsFilename:\s*v\.string\(\)/);
});

test("runSeed calls importLeads action for farms and markets", () => {
  assert.match(source, /ctx\.runAction\(api\.seeds\.importLeads\.importLeads,\s*\{/);
  assert.match(source, /csvContent:\s*args\.farmsCsvContent/);
  assert.match(source, /filename:\s*args\.farmsFilename/);
  assert.match(source, /csvContent:\s*args\.marketsCsvContent/);
  assert.match(source, /filename:\s*args\.marketsFilename/);
});

test("runSeed returns combined farms and markets results with errors field", () => {
  assert.match(source, /return\s*\{\s*farms:\s*\{/);
  assert.match(source, /markets:\s*\{/);
  assert.match(source, /inserted:\s*farmsResult\.inserted/);
  assert.match(source, /skipped:\s*farmsResult\.skipped/);
  assert.match(source, /errors:\s*farmsResult\.errored/);
  assert.match(source, /inserted:\s*marketsResult\.inserted/);
  assert.match(source, /skipped:\s*marketsResult\.skipped/);
  assert.match(source, /errors:\s*marketsResult\.errored/);
});
