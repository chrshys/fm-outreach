import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

// ============================================================
// Tests for listCells returning object with cells and activatedBoundsKeys
// ============================================================

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// --- Source-code structure tests ---

test("listCells returns an object with cells and activatedBoundsKeys", () => {
  const listCellsBlock = source.slice(source.indexOf("export const listCells"));
  assert.match(listCellsBlock, /return\s*\{/);
  assert.match(listCellsBlock, /cells:\s*cells\.map\(/);
  assert.match(listCellsBlock, /activatedBoundsKeys/);
});

test("listCells queries depth-0 cells using by_gridId index", () => {
  const listCellsBlock = source.slice(source.indexOf("export const listCells"));
  assert.match(listCellsBlock, /\.withIndex\("by_gridId"/);
  assert.match(listCellsBlock, /depth.*0/);
});

test("listCells includes boundsKey in per-cell mapping", () => {
  const listCellsBlock = source.slice(source.indexOf("export const listCells"));
  assert.match(listCellsBlock, /boundsKey:\s*cell\.boundsKey/);
});

test("activatedBoundsKeys filters out undefined boundsKeys", () => {
  const listCellsBlock = source.slice(source.indexOf("export const listCells"));
  assert.match(listCellsBlock, /\.filter\(/);
  assert.match(listCellsBlock, /key !== undefined/);
});

// --- Behavioral tests with mock db ---

function createMockDb() {
  const store = new Map();
  let counter = 0;

  return {
    _store: store,
    async insert(table, doc) {
      const id = `${table}:${++counter}`;
      store.set(id, { _id: id, _creationTime: Date.now(), ...doc });
      return id;
    },
    async get(id) {
      return store.get(id) ?? null;
    },
    query(table) {
      const docs = [...store.values()].filter((d) =>
        d._id.startsWith(`${table}:`),
      );
      return {
        withIndex(_name, filterFn) {
          const eqs = [];
          const builder = {
            eq(field, value) {
              eqs.push({ field, value });
              return builder;
            },
          };
          filterFn(builder);
          const filtered = docs.filter((d) =>
            eqs.every((e) => d[e.field] === e.value),
          );
          return {
            filter(predicateFn) {
              const q = {
                eq: (a, b) => (doc) => doc[typeof a === "string" ? a : a._field] === b,
                field: (name) => ({ _field: name }),
              };
              const predicate = predicateFn(q);
              const result = filtered.filter(predicate);
              return {
                collect: async () => result,
              };
            },
            collect: async () => filtered,
          };
        },
        collect: async () => docs,
      };
    },
  };
}

// Replicate listCells handler from gridCells.ts
async function listCells(ctx, args) {
  const cells = await ctx.db
    .query("discoveryCells")
    .withIndex("by_gridId_isLeaf", (q) =>
      q.eq("gridId", args.gridId).eq("isLeaf", true),
    )
    .collect();

  const depth0Cells = await ctx.db
    .query("discoveryCells")
    .withIndex("by_gridId", (q) => q.eq("gridId", args.gridId))
    .filter((q) => q.eq(q.field("depth"), 0))
    .collect();

  const activatedBoundsKeys = depth0Cells
    .map((cell) => cell.boundsKey)
    .filter((key) => key !== undefined);

  return {
    cells: cells.map((cell) => ({
      _id: cell._id,
      parentCellId: cell.parentCellId,
      swLat: cell.swLat,
      swLng: cell.swLng,
      neLat: cell.neLat,
      neLng: cell.neLng,
      depth: cell.depth,
      status: cell.status,
      resultCount: cell.resultCount,
      querySaturation: cell.querySaturation,
      lastSearchedAt: cell.lastSearchedAt,
      boundsKey: cell.boundsKey,
      leadsFound: cell.leadsFound,
    })),
    activatedBoundsKeys,
  };
}

function makeCell(gridId, overrides = {}) {
  return {
    gridId,
    swLat: 40.0,
    swLng: -74.0,
    neLat: 40.1,
    neLng: -73.9,
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    resultCount: 0,
    querySaturation: undefined,
    lastSearchedAt: undefined,
    boundsKey: undefined,
    parentCellId: undefined,
    ...overrides,
  };
}

test("listCells returns object with cells array and activatedBoundsKeys array", async () => {
  const db = createMockDb();
  const gridId = "discoveryGrids:1";
  await db.insert("discoveryCells", makeCell(gridId, { boundsKey: "40.0,-74.0" }));

  const result = await listCells({ db }, { gridId });
  assert.ok(Array.isArray(result.cells));
  assert.ok(Array.isArray(result.activatedBoundsKeys));
});

test("activatedBoundsKeys includes boundsKeys from depth-0 cells only", async () => {
  const db = createMockDb();
  const gridId = "discoveryGrids:1";
  await db.insert("discoveryCells", makeCell(gridId, {
    depth: 0,
    isLeaf: false,
    boundsKey: "root-key",
  }));
  await db.insert("discoveryCells", makeCell(gridId, {
    depth: 1,
    isLeaf: true,
    boundsKey: "child-key",
  }));

  const result = await listCells({ db }, { gridId });
  assert.deepStrictEqual(result.activatedBoundsKeys, ["root-key"]);
});

test("activatedBoundsKeys excludes cells with undefined boundsKey", async () => {
  const db = createMockDb();
  const gridId = "discoveryGrids:1";
  await db.insert("discoveryCells", makeCell(gridId, { depth: 0, boundsKey: "key-1" }));
  await db.insert("discoveryCells", makeCell(gridId, { depth: 0, boundsKey: undefined }));
  await db.insert("discoveryCells", makeCell(gridId, { depth: 0, boundsKey: "key-2" }));

  const result = await listCells({ db }, { gridId });
  assert.deepStrictEqual(result.activatedBoundsKeys, ["key-1", "key-2"]);
});

test("cells array includes boundsKey field", async () => {
  const db = createMockDb();
  const gridId = "discoveryGrids:1";
  await db.insert("discoveryCells", makeCell(gridId, { boundsKey: "my-key" }));

  const result = await listCells({ db }, { gridId });
  assert.equal(result.cells.length, 1);
  assert.equal(result.cells[0].boundsKey, "my-key");
});

test("cells array only contains leaf cells", async () => {
  const db = createMockDb();
  const gridId = "discoveryGrids:1";
  await db.insert("discoveryCells", makeCell(gridId, { isLeaf: true, boundsKey: "k1" }));
  await db.insert("discoveryCells", makeCell(gridId, { isLeaf: false, boundsKey: "k2" }));

  const result = await listCells({ db }, { gridId });
  assert.equal(result.cells.length, 1);
});

test("empty grid returns empty cells and empty activatedBoundsKeys", async () => {
  const db = createMockDb();
  const gridId = "discoveryGrids:1";

  const result = await listCells({ db }, { gridId });
  assert.deepStrictEqual(result.cells, []);
  assert.deepStrictEqual(result.activatedBoundsKeys, []);
});

test("activatedBoundsKeys only includes cells from the requested grid", async () => {
  const db = createMockDb();
  const grid1 = "discoveryGrids:1";
  const grid2 = "discoveryGrids:2";
  await db.insert("discoveryCells", makeCell(grid1, { depth: 0, boundsKey: "g1-key" }));
  await db.insert("discoveryCells", makeCell(grid2, { depth: 0, boundsKey: "g2-key" }));

  const result = await listCells({ db }, { gridId: grid1 });
  assert.deepStrictEqual(result.activatedBoundsKeys, ["g1-key"]);
});

test("map page destructures cells from listCells result", () => {
  const mapSource = fs.readFileSync("src/app/map/page.tsx", "utf8");
  assert.match(mapSource, /gridCellsData\?\.cells/);
});
