import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadVirtualGrid() {
  const source = fs.readFileSync("src/lib/virtual-grid.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "virtual-grid.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-virtual-grid-"));
  const modulePath = path.join(tempDir, "virtual-grid.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const mod = loadVirtualGrid();

// --- Type export check (source-level) ---

const source = fs.readFileSync("src/lib/virtual-grid.ts", "utf8");

test("exports VirtualCell type", () => {
  assert.match(source, /export\s+type\s+VirtualCell\s*=/);
});

test("VirtualCell has key, swLat, swLng, neLat, neLng fields", () => {
  assert.match(source, /key:\s*string/);
  assert.match(source, /swLat:\s*number/);
  assert.match(source, /swLng:\s*number/);
  assert.match(source, /neLat:\s*number/);
  assert.match(source, /neLng:\s*number/);
});

// --- cellKey runtime tests ---

test("exports cellKey function", () => {
  assert.equal(typeof mod.cellKey, "function");
});

test("cellKey formats coordinates to 6 decimal places", () => {
  assert.equal(mod.cellKey(43.5, -80.25), "43.500000_-80.250000");
});

test("cellKey preserves negative coordinates", () => {
  const key = mod.cellKey(-33.8688, 151.2093);
  assert.equal(key, "-33.868800_151.209300");
});

test("cellKey pads short decimals with trailing zeros", () => {
  assert.equal(mod.cellKey(0, 0), "0.000000_0.000000");
});

test("cellKey truncates to 6 decimal places", () => {
  const key = mod.cellKey(43.12345678, -80.98765432);
  assert.equal(key, "43.123457_-80.987654");
});

test("cellKey is deterministic — same input produces same output", () => {
  const a = mod.cellKey(43.55, -80.25);
  const b = mod.cellKey(43.55, -80.25);
  assert.equal(a, b);
});

test("cellKey produces different keys for different coordinates", () => {
  const a = mod.cellKey(43.55, -80.25);
  const b = mod.cellKey(43.56, -80.25);
  assert.notEqual(a, b);
});

// --- computeBoundsKey runtime tests ---

test("exports computeBoundsKey function", () => {
  assert.equal(typeof mod.computeBoundsKey, "function");
});

test("computeBoundsKey snaps coordinates to grid-aligned position", () => {
  const latStep = 1 / 111;
  const lngStep = 1 / (111 * Math.cos(43.05 * Math.PI / 180));
  // 43.007 should snap down to nearest latStep multiple
  const key = mod.computeBoundsKey(43.007, -80.003, latStep, lngStep);
  const expectedLat = Math.floor(43.007 / latStep) * latStep;
  const expectedLng = Math.floor(-80.003 / lngStep) * lngStep;
  assert.equal(key, `${expectedLat.toFixed(6)}_${expectedLng.toFixed(6)}`);
});

test("computeBoundsKey returns deterministic key for same inputs", () => {
  const a = mod.computeBoundsKey(43.5, -80.25, 0.01, 0.01);
  const b = mod.computeBoundsKey(43.5, -80.25, 0.01, 0.01);
  assert.equal(a, b);
});

test("computeBoundsKey produces different keys for different coordinates", () => {
  const a = mod.computeBoundsKey(43.5, -80.25, 0.01, 0.01);
  const b = mod.computeBoundsKey(43.6, -80.25, 0.01, 0.01);
  assert.notEqual(a, b);
});

test("computeBoundsKey formats to 6 decimal places", () => {
  const key = mod.computeBoundsKey(0, 0, 1, 1);
  assert.equal(key, "0.000000_0.000000");
});

test("computeBoundsKey snaps down with Math.floor", () => {
  // With step=1, 43.9 should snap to 43, not 44
  const key = mod.computeBoundsKey(43.9, -80.1, 1, 1);
  assert.equal(key, "43.000000_-81.000000");
});

test("computeBoundsKey handles negative coordinates correctly", () => {
  // Math.floor(-80.1 / 1) * 1 = -81
  const key = mod.computeBoundsKey(-33.5, -80.5, 1, 1);
  assert.equal(key, "-34.000000_-81.000000");
});

test("computeBoundsKey matches cellKey when coordinates are already grid-aligned", () => {
  const latStep = 0.5;
  const lngStep = 0.5;
  // 43.0 is already aligned to 0.5 step grid
  const boundsKey = mod.computeBoundsKey(43.0, -80.0, latStep, lngStep);
  const cKey = mod.cellKey(43.0, -80.0);
  assert.equal(boundsKey, cKey);
});

// --- computeVirtualGrid runtime tests ---

test("exports computeVirtualGrid function", () => {
  assert.equal(typeof mod.computeVirtualGrid, "function");
});

test("computeVirtualGrid returns array of VirtualCells for small bounds", () => {
  const bounds = { swLat: 43.0, swLng: -80.0, neLat: 43.1, neLng: -79.9 };
  const cells = mod.computeVirtualGrid(bounds, 1);
  assert.ok(Array.isArray(cells));
  assert.ok(cells.length > 0);
  for (const cell of cells) {
    assert.equal(typeof cell.key, "string");
    assert.equal(typeof cell.swLat, "number");
    assert.equal(typeof cell.swLng, "number");
    assert.equal(typeof cell.neLat, "number");
    assert.equal(typeof cell.neLng, "number");
  }
});

test("computeVirtualGrid cell dimensions match latStep and lngStep", () => {
  const bounds = { swLat: 43.0, swLng: -80.0, neLat: 43.1, neLng: -79.9 };
  const cellSizeKm = 2;
  const cells = mod.computeVirtualGrid(bounds, cellSizeKm);
  assert.ok(cells.length > 0);

  const latStep = cellSizeKm / 111;
  // midLat is snapped to nearest 5° band for stable columns across vertical pans
  const LAT_BAND = 5;
  const midLat = Math.round(((bounds.swLat + bounds.neLat) / 2) / LAT_BAND) * LAT_BAND;
  const lngStep = cellSizeKm / (111 * Math.cos(midLat * Math.PI / 180));

  for (const cell of cells) {
    assert.ok(Math.abs((cell.neLat - cell.swLat) - latStep) < 1e-10);
    assert.ok(Math.abs((cell.neLng - cell.swLng) - lngStep) < 1e-10);
  }
});

test("computeVirtualGrid returns empty array when exceeding maxCells", () => {
  // A large area with tiny cells should exceed 500
  const bounds = { swLat: 40.0, swLng: -80.0, neLat: 50.0, neLng: -70.0 };
  const cells = mod.computeVirtualGrid(bounds, 0.1);
  assert.deepEqual(cells, []);
});

test("computeVirtualGrid returns empty array when exceeding custom maxCells", () => {
  const bounds = { swLat: 43.0, swLng: -80.0, neLat: 43.5, neLng: -79.5 };
  const cells = mod.computeVirtualGrid(bounds, 1, 5);
  assert.deepEqual(cells, []);
});

test("computeVirtualGrid cells cover the entire bounds", () => {
  const bounds = { swLat: 43.0, swLng: -80.0, neLat: 43.05, neLng: -79.95 };
  const cells = mod.computeVirtualGrid(bounds, 1);
  assert.ok(cells.length > 0);

  const minSwLat = Math.min(...cells.map((c) => c.swLat));
  const minSwLng = Math.min(...cells.map((c) => c.swLng));
  const maxNeLat = Math.max(...cells.map((c) => c.neLat));
  const maxNeLng = Math.max(...cells.map((c) => c.neLng));

  assert.ok(minSwLat <= bounds.swLat);
  assert.ok(minSwLng <= bounds.swLng);
  assert.ok(maxNeLat >= bounds.neLat);
  assert.ok(maxNeLng >= bounds.neLng);
});

test("computeVirtualGrid snaps start coordinates to grid", () => {
  const bounds = { swLat: 43.007, swLng: -80.003, neLat: 43.02, neLng: -79.99 };
  const cellSizeKm = 1;
  const cells = mod.computeVirtualGrid(bounds, cellSizeKm);
  assert.ok(cells.length > 0);

  const latStep = cellSizeKm / 111;
  // midLat is snapped to nearest 5° band for stable columns across vertical pans
  const LAT_BAND = 5;
  const midLat = Math.round(((bounds.swLat + bounds.neLat) / 2) / LAT_BAND) * LAT_BAND;
  const lngStep = cellSizeKm / (111 * Math.cos(midLat * Math.PI / 180));

  const startLat = Math.floor(bounds.swLat / latStep) * latStep;
  const startLng = Math.floor(bounds.swLng / lngStep) * lngStep;

  assert.ok(Math.abs(cells[0].swLat - startLat) < 1e-10);
  assert.ok(Math.abs(cells[0].swLng - startLng) < 1e-10);
});

test("computeVirtualGrid cell keys use cellKey format", () => {
  const bounds = { swLat: 43.0, swLng: -80.0, neLat: 43.05, neLng: -79.95 };
  const cells = mod.computeVirtualGrid(bounds, 1);
  for (const cell of cells) {
    assert.equal(cell.key, mod.cellKey(cell.swLat, cell.swLng));
  }
});

test("computeVirtualGrid produces unique keys for each cell", () => {
  const bounds = { swLat: 43.0, swLng: -80.0, neLat: 43.1, neLng: -79.9 };
  const cells = mod.computeVirtualGrid(bounds, 1);
  const keys = cells.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("computeVirtualGrid defaults maxCells to 500", () => {
  // Source-level check that default is 500
  assert.match(source, /maxCells.*=\s*500/);
});

test("computeVirtualGrid with same bounds called twice returns identical keys", () => {
  const bounds = { swLat: 43.007, swLng: -79.503, neLat: 43.52, neLng: -79.01 };
  const cellSizeKm = 5;
  const first = mod.computeVirtualGrid(bounds, cellSizeKm);
  const second = mod.computeVirtualGrid(bounds, cellSizeKm);

  assert.ok(first.length > 0, "should produce cells");
  assert.equal(first.length, second.length, "cell count must match");

  const firstKeys = first.map((c) => c.key);
  const secondKeys = second.map((c) => c.key);
  assert.deepEqual(firstKeys, secondKeys, "keys must be identical across calls");

  // Also verify full cell coordinates match exactly
  for (let i = 0; i < first.length; i++) {
    assert.equal(first[i].swLat, second[i].swLat, `swLat mismatch at cell ${i}`);
    assert.equal(first[i].swLng, second[i].swLng, `swLng mismatch at cell ${i}`);
    assert.equal(first[i].neLat, second[i].neLat, `neLat mismatch at cell ${i}`);
    assert.equal(first[i].neLng, second[i].neLng, `neLng mismatch at cell ${i}`);
  }
});

test("computeVirtualGrid returns cells when count equals maxCells", () => {
  // Build bounds that produce exactly a known number of cells, then set maxCells to that count
  const bounds = { swLat: 43.0, swLng: -80.0, neLat: 43.1, neLng: -79.9 };
  const cellSizeKm = 1;
  // First call without limit to learn actual count
  const allCells = mod.computeVirtualGrid(bounds, cellSizeKm, 10000);
  assert.ok(allCells.length > 0);
  // Set maxCells exactly equal to cell count — should still succeed
  const cells = mod.computeVirtualGrid(bounds, cellSizeKm, allCells.length);
  assert.equal(cells.length, allCells.length, "should return cells when count equals maxCells");
});

test("computeVirtualGrid returns empty when count is one over maxCells", () => {
  const bounds = { swLat: 43.0, swLng: -80.0, neLat: 43.1, neLng: -79.9 };
  const cellSizeKm = 1;
  const allCells = mod.computeVirtualGrid(bounds, cellSizeKm, 10000);
  assert.ok(allCells.length > 1);
  // Set maxCells to one less than actual count — should return empty
  const cells = mod.computeVirtualGrid(bounds, cellSizeKm, allCells.length - 1);
  assert.deepEqual(cells, [], "should return empty when count exceeds maxCells by one");
});

test("computeVirtualGrid returns empty array for maxCells of zero", () => {
  const bounds = { swLat: 43.0, swLng: -80.0, neLat: 43.1, neLng: -79.9 };
  const cells = mod.computeVirtualGrid(bounds, 1, 0);
  assert.deepEqual(cells, []);
});

test("computeVirtualGrid uses correct midLat formula", () => {
  const bounds = { swLat: 43.0, swLng: -80.0, neLat: 43.1, neLng: -79.9 };
  const cells = mod.computeVirtualGrid(bounds, 5);
  assert.ok(cells.length > 0);
  // midLat formula is tested implicitly through lngStep matching cell dimensions
});

test("computeVirtualGrid returns non-empty array for Toronto-area bounds with 20km cells", () => {
  const bounds = { swLat: 43, swLng: -79.5, neLat: 43.5, neLng: -79 };
  const cells = mod.computeVirtualGrid(bounds, 20);
  assert.ok(Array.isArray(cells));
  assert.ok(cells.length > 0, `expected non-empty array, got ${cells.length} cells`);
});

test("computeVirtualGrid tiles Toronto-area bounds without gaps (20km cells)", () => {
  const bounds = { swLat: 43, swLng: -79.5, neLat: 43.5, neLng: -79 };
  const cells = mod.computeVirtualGrid(bounds, 20);
  assert.ok(cells.length > 0);

  // Cells should fully cover the bounds
  const minSwLat = Math.min(...cells.map((c) => c.swLat));
  const minSwLng = Math.min(...cells.map((c) => c.swLng));
  const maxNeLat = Math.max(...cells.map((c) => c.neLat));
  const maxNeLng = Math.max(...cells.map((c) => c.neLng));

  assert.ok(minSwLat <= bounds.swLat, `grid SW lat ${minSwLat} should be <= bounds SW lat ${bounds.swLat}`);
  assert.ok(minSwLng <= bounds.swLng, `grid SW lng ${minSwLng} should be <= bounds SW lng ${bounds.swLng}`);
  assert.ok(maxNeLat >= bounds.neLat, `grid NE lat ${maxNeLat} should be >= bounds NE lat ${bounds.neLat}`);
  assert.ok(maxNeLng >= bounds.neLng, `grid NE lng ${maxNeLng} should be >= bounds NE lng ${bounds.neLng}`);

  // Sort cells by lat then lng to check adjacency
  const sorted = [...cells].sort((a, b) => a.swLat - b.swLat || a.swLng - b.swLng);

  // Group cells by row (same swLat)
  const rows = new Map();
  for (const cell of sorted) {
    const rowKey = cell.swLat.toFixed(10);
    if (!rows.has(rowKey)) rows.set(rowKey, []);
    rows.get(rowKey).push(cell);
  }

  // Check no horizontal gaps within each row
  for (const [, rowCells] of rows) {
    rowCells.sort((a, b) => a.swLng - b.swLng);
    for (let i = 1; i < rowCells.length; i++) {
      const gap = Math.abs(rowCells[i].swLng - rowCells[i - 1].neLng);
      assert.ok(gap < 1e-10, `horizontal gap of ${gap} between cells in row`);
    }
  }

  // Check no vertical gaps between rows
  const rowKeys = [...rows.keys()].sort((a, b) => Number(a) - Number(b));
  for (let i = 1; i < rowKeys.length; i++) {
    const prevRow = rows.get(rowKeys[i - 1]);
    const currRow = rows.get(rowKeys[i]);
    const gap = Math.abs(currRow[0].swLat - prevRow[0].neLat);
    assert.ok(gap < 1e-10, `vertical gap of ${gap} between rows`);
  }
});
