import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/map-bounds-emitter.tsx",
  "utf8"
)

test("has 'use client' directive", () => {
  assert.match(source, /^"use client"/)
})

test("imports useMap from react-leaflet", () => {
  assert.match(source, /import\s+\{[\s\S]*useMap[\s\S]*\}\s+from\s+"react-leaflet"/)
})

test("imports useMapEvents from react-leaflet", () => {
  assert.match(source, /import\s+\{[\s\S]*useMapEvents[\s\S]*\}\s+from\s+"react-leaflet"/)
})

test("imports useEffect from react", () => {
  assert.match(source, /import\s+\{[\s\S]*useEffect[\s\S]*\}\s+from\s+"react"/)
})

test("exports MapBounds type with swLat, swLng, neLat, neLng", () => {
  assert.match(source, /export\s+type\s+MapBounds\s*=/)
  assert.match(source, /swLat:\s*number/)
  assert.match(source, /swLng:\s*number/)
  assert.match(source, /neLat:\s*number/)
  assert.match(source, /neLng:\s*number/)
})

test("exports MapBoundsEmitter as named export", () => {
  assert.match(source, /export\s+function\s+MapBoundsEmitter/)
})

test("accepts onBoundsChange callback prop", () => {
  assert.match(source, /onBoundsChange:\s*\(bounds:\s*MapBounds\)\s*=>\s*void/)
})

test("calls useMap() to get map instance", () => {
  assert.match(source, /useMap\(\)/)
})

test("listens for moveend event via useMapEvents", () => {
  assert.match(source, /moveend/)
})

test("listens for zoomend event via useMapEvents", () => {
  assert.match(source, /zoomend/)
})

test("reads bounds via getBounds/getSouthWest/getNorthEast", () => {
  assert.match(source, /getBounds\(\)/)
  assert.match(source, /getSouthWest\(\)/)
  assert.match(source, /getNorthEast\(\)/)
})

test("emits initial bounds on mount via useEffect", () => {
  assert.match(source, /useEffect\(/)
  assert.match(source, /onBoundsChange\(getBounds\(map\)\)/)
})

test("renders null (no visual output)", () => {
  assert.match(source, /return\s+null/)
})
