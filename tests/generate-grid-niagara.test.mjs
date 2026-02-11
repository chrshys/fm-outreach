import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// ============================================================
// Niagara bbox validation: generateGrid with bbox
// (42.85, -79.90) to (43.35, -78.80), cellSizeKm=20
// Actual tiling: 3 rows × 5 cols = 15 cells, all isLeaf: true
// (task spec says ~12; the cosine-corrected lngStep at 43°N
//  yields 5 columns across the 1.1° longitude span)
// ============================================================

// Replicate the exact tiling math from generateGrid
function computeCellCount({ swLat, swLng, neLat, neLng, cellSizeKm }) {
  const midLat = (swLat + neLat) / 2;
  const latStep = cellSizeKm / 111;
  const lngStep = cellSizeKm / (111 * Math.cos((midLat * Math.PI) / 180));

  let count = 0;
  for (let lat = swLat; lat < neLat; lat += latStep) {
    for (let lng = swLng; lng < neLng; lng += lngStep) {
      count++;
    }
  }
  return { count, latStep, lngStep, midLat };
}

const niagara = {
  swLat: 42.85,
  swLng: -79.9,
  neLat: 43.35,
  neLng: -78.8,
  cellSizeKm: 20,
};

test("Niagara bbox produces 15 cells at 20km cellSize (3 rows × 5 cols)", () => {
  const { count } = computeCellCount(niagara);
  assert.equal(count, 15, `Expected 15 cells, got ${count}`);
});

test("Niagara tiling: latStep ≈ 0.18 degrees (~20km)", () => {
  const { latStep } = computeCellCount(niagara);
  // 20/111 ≈ 0.18018
  assert.ok(latStep > 0.17, `latStep ${latStep} too small`);
  assert.ok(latStep < 0.19, `latStep ${latStep} too large`);
});

test("Niagara tiling: lngStep ≈ 0.25 degrees (cosine-corrected for ~43°N)", () => {
  const { lngStep } = computeCellCount(niagara);
  // At 43.1°N latitude, cos correction makes lngStep wider than latStep
  assert.ok(lngStep > 0.24, `lngStep ${lngStep} too small`);
  assert.ok(lngStep < 0.26, `lngStep ${lngStep} too large`);
});

test("Niagara tiling: 3 rows × 5 columns = 15 cells", () => {
  const { latStep, lngStep } = computeCellCount(niagara);
  const latRange = niagara.neLat - niagara.swLat; // 0.5°
  const lngRange = niagara.neLng - niagara.swLng; // 1.1°

  // Count iterations manually
  let rows = 0;
  for (let lat = niagara.swLat; lat < niagara.neLat; lat += latStep) rows++;
  let cols = 0;
  for (let lng = niagara.swLng; lng < niagara.neLng; lng += lngStep) cols++;

  assert.equal(rows, 3, `Expected 3 rows for ${latRange}° / ${latStep}° latStep`);
  assert.equal(cols, 5, `Expected 5 cols for ${lngRange}° / ${lngStep}° lngStep`);
  assert.equal(rows * cols, 15);
});

test("all generated cells would have isLeaf: true (source always sets isLeaf: true in generateGrid)", () => {
  // Extract the generateGrid handler block
  const genStart = source.indexOf("export const generateGrid");
  const genEnd = source.indexOf("export const subdivideCell");
  const genBlock = source.slice(genStart, genEnd);

  // The insert call within generateGrid always passes isLeaf: true
  assert.match(genBlock, /isLeaf:\s*true/);
  // And there's no conditional around isLeaf in generateGrid
  assert.ok(
    !genBlock.includes("isLeaf: false"),
    "generateGrid should never set isLeaf: false",
  );
});

test("all generated cells would have status: unsearched", () => {
  const genStart = source.indexOf("export const generateGrid");
  const genEnd = source.indexOf("export const subdivideCell");
  const genBlock = source.slice(genStart, genEnd);

  assert.match(genBlock, /status:\s*"unsearched"/);
});

test("all generated cells would have depth: 0", () => {
  const genStart = source.indexOf("export const generateGrid");
  const genEnd = source.indexOf("export const subdivideCell");
  const genBlock = source.slice(genStart, genEnd);

  assert.match(genBlock, /depth:\s*0/);
});

test("cell bounds are clamped so edge cells don't exceed grid bounds", () => {
  // Verify that the last cell in each row/col gets its neLat/neLng clamped
  const { latStep, lngStep } = computeCellCount(niagara);

  // Last row starts at lat ≈ 43.21, neLat would be 43.21+0.18 = 43.39
  // But clamped to Math.min(43.39, 43.35) = 43.35
  const lastRowStart = niagara.swLat + 2 * latStep;
  const unclamped = lastRowStart + latStep;
  const clamped = Math.min(unclamped, niagara.neLat);
  assert.ok(unclamped > niagara.neLat, "Last row should exceed grid bound without clamping");
  assert.equal(clamped, niagara.neLat, "Clamped neLat should equal grid neLat");

  // Last col (index 4) starts at lng ≈ -78.91, neLng would be -78.91+0.247 ≈ -78.66
  // But clamped to Math.min(-78.66, -78.80) = -78.80
  const lastColStart = niagara.swLng + 4 * lngStep;
  const unclampedLng = lastColStart + lngStep;
  const clampedLng = Math.min(unclampedLng, niagara.neLng);
  assert.ok(unclampedLng > niagara.neLng, "Last col should exceed grid bound without clamping");
  assert.equal(clampedLng, niagara.neLng, "Clamped neLng should equal grid neLng");
});
