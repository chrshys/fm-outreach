import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");
const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
);

// ============================================================
// 1. Removed functions no longer exist in gridCells.ts
// ============================================================

test("generateGrid mutation is removed", () => {
  assert.doesNotMatch(source, /export\s+const\s+generateGrid\b/);
});

test("requestDeleteGrid mutation is removed", () => {
  assert.doesNotMatch(source, /export\s+const\s+requestDeleteGrid\b/);
});

test("deleteGrid action is removed", () => {
  assert.doesNotMatch(source, /export\s+const\s+deleteGrid\b/);
});

test("deleteGridRecord mutation is removed", () => {
  assert.doesNotMatch(source, /export\s+const\s+deleteGridRecord\b/);
});

test("deleteCellBatch mutation is removed", () => {
  assert.doesNotMatch(source, /export\s+const\s+deleteCellBatch\b/);
});

test("DELETE_BATCH_SIZE constant is removed", () => {
  assert.doesNotMatch(source, /DELETE_BATCH_SIZE/);
});

test("DEFAULT_CELL_SIZE_KM constant is removed", () => {
  assert.doesNotMatch(source, /DEFAULT_CELL_SIZE_KM/);
});

test("DEFAULT_QUERIES constant is removed", () => {
  assert.doesNotMatch(source, /DEFAULT_QUERIES/);
});

// ============================================================
// 2. Unused imports cleaned up
// ============================================================

test("internal import from _generated/api is removed", () => {
  assert.doesNotMatch(source, /from\s*"\.\.\/\_generated\/api"/);
});

test("internalAction import is removed", () => {
  assert.doesNotMatch(source, /internalAction/);
});

// ============================================================
// 3. Remaining functions still exist and are intact
// ============================================================

test("subdivideCell mutation still exists", () => {
  assert.match(source, /export\s+const\s+subdivideCell\s*=\s*mutation\(/);
});

test("undivideCell mutation still exists", () => {
  assert.match(source, /export\s+const\s+undivideCell\s*=\s*mutation\(/);
});

test("listGrids query still exists", () => {
  assert.match(source, /export\s+const\s+listGrids\s*=\s*query\(/);
});

test("updateGridQueries mutation still exists", () => {
  assert.match(source, /export\s+const\s+updateGridQueries\s*=\s*mutation\(/);
});

test("listCells query still exists", () => {
  assert.match(source, /export\s+const\s+listCells\s*=\s*query\(/);
});

test("claimCellForSearch internalMutation still exists", () => {
  assert.match(
    source,
    /export\s+const\s+claimCellForSearch\s*=\s*internalMutation\(/,
  );
});

test("getCell internalQuery still exists", () => {
  assert.match(source, /export\s+const\s+getCell\s*=\s*internalQuery\(/);
});

test("updateCellStatus internalMutation still exists", () => {
  assert.match(
    source,
    /export\s+const\s+updateCellStatus\s*=\s*internalMutation\(/,
  );
});

test("updateCellSearchResult internalMutation still exists", () => {
  assert.match(
    source,
    /export\s+const\s+updateCellSearchResult\s*=\s*internalMutation\(/,
  );
});

// ============================================================
// 4. Discovery panel no longer references removed functions
// ============================================================

test("panel does not reference generateGrid", () => {
  assert.doesNotMatch(panelSource, /generateGrid/);
});

test("panel does not have New Grid form state", () => {
  assert.doesNotMatch(panelSource, /showNewGridForm/);
  assert.doesNotMatch(panelSource, /setShowNewGridForm/);
});

test("panel does not have handleCreateGrid", () => {
  assert.doesNotMatch(panelSource, /handleCreateGrid/);
});

test("panel still uses updateGridQueries mutation", () => {
  assert.match(
    panelSource,
    /useMutation\(api\.discovery\.gridCells\.updateGridQueries\)/,
  );
});

test("panel still queries listGrids", () => {
  assert.match(
    panelSource,
    /useQuery\(api\.discovery\.gridCells\.listGrids\)/,
  );
});
