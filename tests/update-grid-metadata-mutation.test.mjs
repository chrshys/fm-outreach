import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// ============================================================
// 1. Module structure
// ============================================================

test("updateGridMetadata is exported as a public mutation", () => {
  assert.match(source, /export\s+const\s+updateGridMetadata\s*=\s*mutation\(/);
});

// ============================================================
// 2. Args validation
// ============================================================

test("updateGridMetadata accepts gridId as v.id('discoveryGrids')", () => {
  const block = source.match(
    /export\s+const\s+updateGridMetadata\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block, "updateGridMetadata block not found");
  const body = block[1];

  assert.match(body, /gridId:\s*v\.id\("discoveryGrids"\)/);
});

test("updateGridMetadata accepts region as v.optional(v.string())", () => {
  const block = source.match(
    /export\s+const\s+updateGridMetadata\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block);
  const body = block[1];

  assert.match(body, /region:\s*v\.optional\(v\.string\(\)\)/);
});

test("updateGridMetadata accepts province as v.optional(v.string())", () => {
  const block = source.match(
    /export\s+const\s+updateGridMetadata\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block);
  const body = block[1];

  assert.match(body, /province:\s*v\.optional\(v\.string\(\)\)/);
});

// ============================================================
// 3. Grid existence check
// ============================================================

test("updateGridMetadata fetches the grid record with ctx.db.get", () => {
  const block = source.match(
    /export\s+const\s+updateGridMetadata\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block);
  const body = block[1];

  assert.match(body, /ctx\.db\.get\(args\.gridId\)/);
});

test("updateGridMetadata throws ConvexError when grid not found", () => {
  const block = source.match(
    /export\s+const\s+updateGridMetadata\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block);
  const body = block[1];

  assert.match(body, /throw\s+new\s+ConvexError\(/);
  assert.match(body, /Grid not found/);
});

// ============================================================
// 4. Conditional patching
// ============================================================

test("updateGridMetadata only patches fields that are present in args", () => {
  const block = source.match(
    /export\s+const\s+updateGridMetadata\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block);
  const body = block[1];

  // Should check args.region !== undefined before adding to patch
  assert.match(body, /args\.region\s*!==\s*undefined/);
  // Should check args.province !== undefined before adding to patch
  assert.match(body, /args\.province\s*!==\s*undefined/);
});

test("updateGridMetadata builds a patch object before calling ctx.db.patch", () => {
  const block = source.match(
    /export\s+const\s+updateGridMetadata\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block);
  const body = block[1];

  // Should construct a patch object and pass it to ctx.db.patch
  assert.match(body, /const\s+patch/);
  assert.match(body, /ctx\.db\.patch\(args\.gridId,\s*patch\)/);
});

test("updateGridMetadata does not patch all args blindly", () => {
  const block = source.match(
    /export\s+const\s+updateGridMetadata\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block);
  const body = block[1];

  // Should NOT do ctx.db.patch(args.gridId, args) or similar
  assert.doesNotMatch(body, /ctx\.db\.patch\(args\.gridId,\s*args\)/);
});
