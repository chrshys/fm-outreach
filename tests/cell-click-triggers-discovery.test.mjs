import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const cellColorsSource = fs.readFileSync("src/components/map/cell-colors.ts", "utf8")
const discoverCellSource = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8")
const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")

// ============================================================
// User story: clicking unsearched cell triggers discovery,
// cell turns green (searched) or orange (saturated)
// ============================================================

// --- Step 1: Click dispatches discovery ---

test("search action with google_places mechanism calls requestDiscoverCell", () => {
  assert.match(pageSource, /action\.mechanism\s*!==\s*"google_places"/)
  assert.match(pageSource, /requestDiscoverCell\(\{\s*cellId/)
})

test("requestDiscoverCell only accepts unsearched or searched cells", () => {
  const block = discoverCellSource.slice(
    discoverCellSource.indexOf("requestDiscoverCell"),
  )
  assert.match(block, /status\s*!==\s*"unsearched"/)
  assert.match(block, /status\s*!==\s*"searched"/)
})

test("requestDiscoverCell schedules async discoverCell action", () => {
  const block = discoverCellSource.slice(
    discoverCellSource.indexOf("requestDiscoverCell"),
  )
  assert.match(block, /ctx\.scheduler\.runAfter/)
  assert.match(block, /internal\.discovery\.discoverCell\.discoverCell/)
})

// --- Step 2: Cell transitions to searching (blue) ---

test("claimCellForSearch transitions cell to searching status", () => {
  assert.match(gridCellsSource, /claimCellForSearch/)
  assert.match(gridCellsSource, /patch\(args\.cellId,\s*\{\s*status:\s*"searching"\s*\}\)/)
})

test("searching status maps to blue (#3b82f6)", () => {
  assert.match(cellColorsSource, /searching.*#3b82f6/)
})

// --- Step 3: Discovery completes → searched (green) or saturated (orange) ---

test("discoverCell sets status to searched when not all queries saturated", () => {
  assert.match(
    discoverCellSource,
    /saturated\s*\?\s*"saturated"\s*:\s*"searched"/,
  )
})

test("saturation requires ALL queries to hit 60 API results and high in-bounds count", () => {
  assert.match(
    discoverCellSource,
    /queryResults\.every\(\(\{ totalCount \}\)\s*=>\s*totalCount\s*>=\s*GOOGLE_MAX_RESULTS\)/,
  )
  assert.match(
    discoverCellSource,
    /querySaturation\.every\(\(qs\)\s*=>\s*qs\.count\s*>=\s*20\)/,
  )
})

test("GOOGLE_MAX_RESULTS is defined as 60", () => {
  assert.match(discoverCellSource, /GOOGLE_MAX_RESULTS\s*=\s*60/)
})

test("searched status maps to green (#22c55e)", () => {
  assert.match(cellColorsSource, /searched.*#22c55e/)
})

test("saturated status maps to orange (#f97316)", () => {
  assert.match(cellColorsSource, /saturated.*#f97316/)
})

// --- Step 4: Color result structure ---

test("cell color result includes color, fillColor, and fillOpacity", () => {
  for (const status of ["unsearched", "searching", "searched", "saturated"]) {
    const re = new RegExp(`${status}:\\s*\\{[^}]*color:`)
    assert.match(cellColorsSource, re, `${status} missing color field`)
  }
})

test("searched fillOpacity is less than saturated fillOpacity", () => {
  const searchedMatch = cellColorsSource.match(
    /searched:\s*\{[^}]*fillOpacity:\s*([\d.]+)/,
  )
  const saturatedMatch = cellColorsSource.match(
    /saturated:\s*\{[^}]*fillOpacity:\s*([\d.]+)/,
  )
  assert.ok(searchedMatch, "searched fillOpacity not found")
  assert.ok(saturatedMatch, "saturated fillOpacity not found")
  assert.ok(
    parseFloat(searchedMatch[1]) < parseFloat(saturatedMatch[1]),
    "saturated should have higher fillOpacity than searched",
  )
})

// --- Step 5: Error recovery ---

test("discovery failure rolls back cell status to previous state", () => {
  assert.match(discoverCellSource, /catch\s*\(error\)/)
  assert.match(discoverCellSource, /updateCellStatus/)
  assert.match(discoverCellSource, /status:\s*previousStatus/)
})

// --- Step 6: UI feedback ---

test("success toast shown when discovery starts", () => {
  assert.match(pageSource, /toast\.success\("Discovery started for cell"\)/)
})

test("error toast shown when discovery request fails", () => {
  assert.match(
    pageSource,
    /toast\.error\(err instanceof Error \? err\.message : "Failed to discover cell"\)/,
  )
})

test("info toast shown when cell is already searching", () => {
  assert.match(pageSource, /toast\.info\("Search already in progress"\)/)
})

// --- Step 7: Unsearched is the default starting state ---

test("new cells created by subdivideCell start as unsearched", () => {
  assert.match(gridCellsSource, /status:\s*"unsearched"/)
})

test("unsearched status maps to gray (#9ca3af)", () => {
  assert.match(cellColorsSource, /unsearched.*#9ca3af/)
})
