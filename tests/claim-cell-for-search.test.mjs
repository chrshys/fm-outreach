import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// ============================================================
// 1. Module structure
// ============================================================

test("claimCellForSearch is exported as an internalMutation", () => {
  assert.match(
    source,
    /export\s+const\s+claimCellForSearch\s*=\s*internalMutation\(/,
  );
});

test("imports internalMutation from convex server", () => {
  assert.match(
    source,
    /import\s*\{[^}]*internalMutation[^}]*\}\s*from\s*"\.\.\/\_generated\/server"/,
  );
});

// ============================================================
// 2. Args validation
// ============================================================

test("accepts cellId as discoveryCells id", () => {
  assert.match(source, /cellId:\s*v\.id\("discoveryCells"\)/);
});

test("accepts expectedStatuses as array of strings", () => {
  assert.match(source, /expectedStatuses:\s*v\.array\(v\.string\(\)\)/);
});

// ============================================================
// 3. Cell lookup and not-found guard
// ============================================================

test("reads cell from database using ctx.db.get", () => {
  // Must read the cell by id within the claimCellForSearch handler
  const claimSection = source.slice(
    source.indexOf("claimCellForSearch"),
  );
  assert.match(claimSection, /ctx\.db\.get\(args\.cellId\)/);
});

test("throws ConvexError when cell is not found", () => {
  const claimSection = source.slice(
    source.indexOf("claimCellForSearch"),
  );
  assert.match(claimSection, /throw new ConvexError\("Cell not found"\)/);
});

// ============================================================
// 4. Status validation
// ============================================================

test("checks cell.status against expectedStatuses using includes", () => {
  const claimSection = source.slice(
    source.indexOf("claimCellForSearch"),
  );
  assert.match(claimSection, /args\.expectedStatuses\.includes\(cell\.status\)/);
});

test("throws ConvexError when status does not match expected", () => {
  const claimSection = source.slice(
    source.indexOf("claimCellForSearch"),
  );
  // Should throw with a message that mentions the actual status
  assert.match(claimSection, /throw new ConvexError\(/);
  assert.match(claimSection, /cell\.status/);
  assert.match(claimSection, /expectedStatuses/);
});

// ============================================================
// 5. Status transition
// ============================================================

test("patches cell status to searching", () => {
  const claimSection = source.slice(
    source.indexOf("claimCellForSearch"),
  );
  assert.match(
    claimSection,
    /ctx\.db\.patch\(args\.cellId,\s*\{\s*status:\s*"searching"\s*\}\)/,
  );
});

// ============================================================
// 6. Return value
// ============================================================

test("captures previousStatus before patching", () => {
  const claimSection = source.slice(
    source.indexOf("claimCellForSearch"),
  );
  assert.match(claimSection, /const\s+previousStatus\s*=\s*cell\.status/);
});

test("returns object with previousStatus", () => {
  const claimSection = source.slice(
    source.indexOf("claimCellForSearch"),
  );
  assert.match(claimSection, /return\s*\{\s*previousStatus\s*\}/);
});
