import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

/**
 * Validates that after cluster creation the polygon appears on the map
 * immediately via a pendingPolygon, before the Convex clusters query
 * refreshes. The pending polygon is derived from pendingCluster state
 * and automatically disappears once the cluster appears in the reactive
 * query data.
 */

const mapPageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const mapContentSource = fs.readFileSync(
  "src/components/map/map-content.tsx",
  "utf8",
)

// --- Map page: pendingCluster state and derived pendingPolygon ---

test("map page declares pendingCluster state with boundary and clusterId", () => {
  assert.match(mapPageSource, /\[pendingCluster,\s*setPendingCluster\]\s*=\s*useState/)
  assert.match(mapPageSource, /boundary/)
  assert.match(mapPageSource, /clusterId/)
})

test("pendingPolygon is derived via useMemo from pendingCluster and clusters", () => {
  assert.match(mapPageSource, /const\s+pendingPolygon\s*=\s*useMemo\(/)
  assert.match(mapPageSource, /pendingCluster/)
  assert.match(mapPageSource, /\[pendingCluster,\s*clusters\]/)
})

test("pendingPolygon returns null when cluster already in query", () => {
  assert.match(mapPageSource, /alreadyInQuery/)
  assert.match(mapPageSource, /alreadyInQuery\s*\?\s*null\s*:\s*pendingCluster\.boundary/)
})

test("pendingPolygon checks clusters query for matching clusterId", () => {
  assert.match(
    mapPageSource,
    /\.some\(\s*\n?\s*\(c[^)]*\)\s*=>\s*c\._id\s*===\s*pendingCluster\.clusterId/,
  )
})

test("handleCreateCluster sets pendingCluster with boundary and clusterId", () => {
  assert.match(mapPageSource, /setPendingCluster\(\{\s*boundary:\s*drawnPolygon/)
  assert.match(mapPageSource, /clusterId:\s*result\.clusterId/)
})

test("handleCreateCluster captures mutation result", () => {
  assert.match(
    mapPageSource,
    /const\s+result\s*=\s*await\s+createCluster\(/,
  )
})

test("map page passes pendingPolygon prop to MapContent", () => {
  assert.match(mapPageSource, /pendingPolygon=\{pendingPolygon\}/)
})

// --- MapContent: pendingPolygon rendering ---

test("MapContentProps includes optional pendingPolygon prop", () => {
  assert.match(mapContentSource, /pendingPolygon\?:\s*\{/)
})

test("MapContent destructures pendingPolygon from props", () => {
  assert.match(mapContentSource, /pendingPolygon[,\s}]/)
})

test("MapContent renders Polygon for pendingPolygon when present", () => {
  assert.match(mapContentSource, /pendingPolygon\s*&&\s*pendingPolygon\.length\s*>\s*0/)
})

test("pending polygon uses getClusterColor with next index", () => {
  assert.match(
    mapContentSource,
    /getClusterColor\(clusters\.length\)/,
  )
})

test("pending polygon uses same style as cluster polygons", () => {
  const pendingSection = mapContentSource.slice(
    mapContentSource.indexOf("pendingPolygon &&"),
  )
  assert.match(pendingSection, /fillOpacity:\s*0\.15/)
  assert.match(pendingSection, /weight:\s*2/)
  assert.match(pendingSection, /opacity:\s*0\.6/)
})

test("pending polygon maps coordinates to [lat, lng] positions", () => {
  assert.match(
    mapContentSource,
    /pendingPolygon\.map\(\(p\)\s*=>\s*\[p\.lat,\s*p\.lng\]/,
  )
})

// --- Flow correctness ---

test("drawnPolygon is cleared after creation (not kept stale)", () => {
  assert.match(mapPageSource, /setDrawnPolygon\(null\)/)
})

test("handleCancelDialog does not affect pendingCluster", () => {
  const cancelSection = mapPageSource.slice(
    mapPageSource.indexOf("handleCancelDialog"),
    mapPageSource.indexOf("handleCancelDialog") + 200,
  )
  assert.doesNotMatch(cancelSection, /setPendingCluster/)
})

test("no useEffect used for clearing pending state (avoids lint violation)", () => {
  assert.doesNotMatch(mapPageSource, /useEffect/)
})
