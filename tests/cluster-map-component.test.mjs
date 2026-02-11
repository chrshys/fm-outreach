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

test("imports leaflet L for bounds calculation", () => {
  assert.match(source, /import L from "leaflet"/)
})

test("uses react-leaflet MapContainer, TileLayer, Polygon, CircleMarker, useMap", () => {
  assert.match(source, /import \{ MapContainer, TileLayer, Polygon, CircleMarker, useMap \} from "react-leaflet"/)
})

test("renders MapContainer centered on cluster coordinates", () => {
  assert.match(source, /center=\{\[centerLat, centerLng\]\}/)
})

test("does not use radiusKm for zoom calculation", () => {
  assert.doesNotMatch(source, /radiusKm/)
})

test("FitBounds component uses useMap and fitBounds to fit polygon", () => {
  assert.match(source, /function FitBounds\(/)
  assert.match(source, /const map = useMap\(\)/)
  assert.match(source, /L\.latLngBounds\(positions\)/)
  assert.match(source, /map\.fitBounds\(bounds/)
})

test("FitBounds is rendered inside MapContainer", () => {
  assert.match(source, /<FitBounds positions=\{positions\} \/>/)
})

test("renders cluster boundary Polygon (not Circle)", () => {
  assert.match(source, /<Polygon/)
  assert.match(source, /positions=\{positions\}/)
  assert.doesNotMatch(source, /<Circle[\s>]/)
})

test("converts boundary array to positions", () => {
  assert.match(source, /boundary\.map\(\(p\) => \[p\.lat, p\.lng\]\)/)
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
