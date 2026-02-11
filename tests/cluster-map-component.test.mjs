import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/clusters/cluster-map.tsx", "utf8")

test("is a client component", () => {
  assert.match(source, /^"use client"/)
})

test("imports leaflet CSS", () => {
  assert.match(source, /import "leaflet\/dist\/leaflet\.css"/)
})

test("uses react-leaflet MapContainer, TileLayer, Polygon, CircleMarker", () => {
  assert.match(source, /import \{ MapContainer, TileLayer, Polygon, CircleMarker \} from "react-leaflet"/)
})

test("renders MapContainer centered on cluster coordinates", () => {
  assert.match(source, /center=\{\[centerLat, centerLng\]\}/)
  assert.match(source, /zoom=\{zoom\}/)
})

test("calculates zoom level based on radius", () => {
  assert.match(source, /radiusKm < 2 \? 13/)
  assert.match(source, /radiusKm < 5 \? 12/)
  assert.match(source, /radiusKm < 15 \? 10/)
})

test("renders cluster boundary Polygon", () => {
  assert.match(source, /<Polygon/)
  assert.match(source, /positions=\{positions\}/)
})

test("renders lead CircleMarkers with status colors", () => {
  assert.match(source, /import \{ getStatusColor \} from "@\/components\/map\/status-colors"/)
  assert.match(source, /const color = getStatusColor\(lead\.status\)/)
  assert.match(source, /<CircleMarker/)
  assert.match(source, /center=\{\[lead\.latitude, lead\.longitude\]\}/)
})

test("disables scroll wheel zoom", () => {
  assert.match(source, /scrollWheelZoom=\{false\}/)
})

test("exports as default export", () => {
  assert.match(source, /export default function ClusterMap\(/)
})
