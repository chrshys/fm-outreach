import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// --- State management ---

test("declares isDrawing state initialized to false", () => {
  assert.match(source, /useState\(false\)/)
  assert.match(source, /isDrawing/)
})

test("declares drawnPolygon state initialized to null", () => {
  assert.match(source, /drawnPolygon/)
  assert.match(source, /useState<[\s\S]*\{ lat: number; lng: number \}\[\][\s\S]*>\([\s]*null[\s]*\)/)
})

test("declares showNamingDialog state initialized to false", () => {
  assert.match(source, /showNamingDialog/)
  assert.match(source, /setShowNamingDialog/)
})

test("declares clusterName state for the naming input", () => {
  assert.match(source, /clusterName/)
  assert.match(source, /setClusterName/)
})

// --- Draw Cluster button ---

test("renders a Draw Cluster button", () => {
  assert.match(source, /Draw Cluster/)
})

test("button toggles isDrawing state on click", () => {
  assert.match(source, /setIsDrawing/)
})

test("button shows Cancel Drawing text when isDrawing is true", () => {
  assert.match(source, /Cancel Drawing/)
})

test("button is positioned in top-right control area", () => {
  assert.match(source, /absolute right-3 top-3 z-\[1000\]/)
})

// --- PolygonDraw integration ---

test("passes isDrawing prop to MapContent", () => {
  assert.match(source, /isDrawing=\{isDrawing\}/)
})

test("passes onPolygonDrawn callback to MapContent", () => {
  assert.match(source, /onPolygonDrawn=\{handlePolygonDrawn\}/)
})

test("handlePolygonDrawn sets drawnPolygon, clears isDrawing, opens dialog", () => {
  assert.match(source, /setDrawnPolygon\(latlngs\)/)
  assert.match(source, /setIsDrawing\(false\)/)
  assert.match(source, /setShowNamingDialog\(true\)/)
})

// --- Naming dialog ---

test("renders Dialog component for naming", () => {
  assert.match(source, /import\s+\{[\s\S]*Dialog[\s\S]*\}\s+from\s+"@\/components\/ui\/dialog"/)
  assert.match(source, /<Dialog\s+open=\{showNamingDialog\}/)
})

test("dialog has a title 'Name Your Cluster'", () => {
  assert.match(source, /Name Your Cluster/)
})

test("dialog shows preview count of leads inside polygon", () => {
  assert.match(source, /previewLeadCount/)
  assert.match(source, /lead.*found/)
})

test("computes previewLeadCount using pointInPolygon", () => {
  assert.match(source, /import\s+\{\s*pointInPolygon\s*\}\s+from\s+"@\/lib\/point-in-polygon"/)
  assert.match(source, /pointInPolygon\(/)
})

test("dialog has a text input for cluster name", () => {
  assert.match(source, /<Input/)
  assert.match(source, /id="cluster-name"/)
})

test("dialog has Cancel and Create buttons", () => {
  assert.match(source, />\s*Cancel\s*<\/Button>/)
  assert.match(source, />\s*Create\s*<\/Button>/)
})

test("Create button is disabled when clusterName is empty", () => {
  assert.match(source, /disabled=\{!clusterName\.trim\(\)\}/)
})

test("Create button calls createPolygonCluster mutation", () => {
  assert.match(source, /useMutation\(api\.clusters\.createPolygonCluster\)/)
  assert.match(source, /createCluster\(\{/)
})

test("handleCreateCluster resets state after creating", () => {
  assert.match(source, /setShowNamingDialog\(false\)/)
  assert.match(source, /setDrawnPolygon\(null\)/)
  assert.match(source, /setClusterName\(""\)/)
})

test("Cancel dialog resets all drawing state", () => {
  assert.match(source, /handleCancelDialog/)
})
