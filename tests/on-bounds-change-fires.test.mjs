import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const emitterSource = fs.readFileSync(
  "src/components/map/map-bounds-emitter.tsx",
  "utf8"
)
const mapContentSource = fs.readFileSync(
  "src/components/map/map-content.tsx",
  "utf8"
)

// ── MapBoundsEmitter: fires on pan (moveend) ──

test("onBoundsChange handler is wired to moveend event", () => {
  // useMapEvents block should bind moveend to a handler that calls onBoundsChange
  assert.match(
    emitterSource,
    /useMapEvents\(\{[\s\S]*moveend:\s*\(\)\s*=>\s*onBoundsChange\(getBounds\(map\)\)/,
    "moveend event should invoke onBoundsChange with getBounds(map)"
  )
})

// ── MapBoundsEmitter: fires on zoom (zoomend) ──

test("onBoundsChange handler is wired to zoomend event", () => {
  assert.match(
    emitterSource,
    /useMapEvents\(\{[\s\S]*zoomend:\s*\(\)\s*=>\s*onBoundsChange\(getBounds\(map\)\)/,
    "zoomend event should invoke onBoundsChange with getBounds(map)"
  )
})

// ── MapBoundsEmitter: fires on initial mount ──

test("onBoundsChange fires on mount via useEffect", () => {
  assert.match(
    emitterSource,
    /useEffect\(\(\)\s*=>\s*\{[\s\S]*onBoundsChange\(getBounds\(map\)\)/,
    "useEffect should call onBoundsChange(getBounds(map)) on mount"
  )
})

test("useEffect depends on map and onBoundsChange", () => {
  assert.match(
    emitterSource,
    /useEffect\([\s\S]*\[map,\s*onBoundsChange\]/,
    "useEffect dependency array should include map and onBoundsChange"
  )
})

// ── getBounds extracts correct viewport coordinates ──

test("getBounds reads southWest lat/lng from Leaflet bounds", () => {
  assert.match(emitterSource, /swLat:\s*b\.getSouthWest\(\)\.lat/)
  assert.match(emitterSource, /swLng:\s*b\.getSouthWest\(\)\.lng/)
})

test("getBounds reads northEast lat/lng from Leaflet bounds", () => {
  assert.match(emitterSource, /neLat:\s*b\.getNorthEast\(\)\.lat/)
  assert.match(emitterSource, /neLng:\s*b\.getNorthEast\(\)\.lng/)
})

test("getBounds uses map.getBounds() to get current viewport", () => {
  assert.match(
    emitterSource,
    /const\s+b\s*=\s*map\.getBounds\(\)/,
    "should call map.getBounds() to get Leaflet viewport bounds"
  )
})

// ── MapBounds type has all four coordinate fields ──

test("MapBounds type exports swLat, swLng, neLat, neLng as numbers", () => {
  const typeBlock = emitterSource.match(
    /export\s+type\s+MapBounds\s*=\s*\{([^}]+)\}/
  )
  assert.ok(typeBlock, "MapBounds type should be exported")
  const fields = typeBlock[1]
  assert.match(fields, /swLat:\s*number/)
  assert.match(fields, /swLng:\s*number/)
  assert.match(fields, /neLat:\s*number/)
  assert.match(fields, /neLng:\s*number/)
})

// ── MapContent passes onBoundsChange through to MapBoundsEmitter ──

test("MapContent conditionally renders MapBoundsEmitter with onBoundsChange", () => {
  assert.match(
    mapContentSource,
    /\{onBoundsChange\s*&&\s*\(\s*<MapBoundsEmitter\s+onBoundsChange=\{onBoundsChange\}\s*\/>\s*\)\}/,
    "MapContent should guard MapBoundsEmitter on onBoundsChange presence"
  )
})

// ── Both pan and zoom events use the same getBounds helper ──

test("moveend and zoomend both call getBounds(map) for consistent coordinates", () => {
  const moveBounds = emitterSource.match(
    /moveend:\s*\(\)\s*=>\s*onBoundsChange\((getBounds\(map\))\)/
  )
  const zoomBounds = emitterSource.match(
    /zoomend:\s*\(\)\s*=>\s*onBoundsChange\((getBounds\(map\))\)/
  )
  assert.ok(moveBounds, "moveend should call getBounds(map)")
  assert.ok(zoomBounds, "zoomend should call getBounds(map)")
  assert.equal(
    moveBounds[1],
    zoomBounds[1],
    "moveend and zoomend should use identical getBounds call"
  )
})

// ── MapBoundsEmitter renders nothing (invisible bridge component) ──

test("MapBoundsEmitter returns null so it has no visual output", () => {
  assert.match(emitterSource, /return\s+null/)
})

// ── useMap provides the map instance to getBounds ──

test("useMap() is called to obtain the Leaflet map instance", () => {
  assert.match(
    emitterSource,
    /const\s+map\s*=\s*useMap\(\)/,
    "should store useMap() result in map variable"
  )
})

// ── onBoundsChange is required (not optional) on MapBoundsEmitter ──

test("onBoundsChange is a required prop on MapBoundsEmitter", () => {
  // The prop type should NOT have a question mark
  assert.match(
    emitterSource,
    /onBoundsChange:\s*\(bounds:\s*MapBounds\)\s*=>\s*void/,
    "onBoundsChange should be typed as required callback"
  )
  assert.doesNotMatch(
    emitterSource,
    /onBoundsChange\?:\s*\(bounds:\s*MapBounds\)\s*=>\s*void/,
    "onBoundsChange should NOT be optional on MapBoundsEmitter (MapContent guards rendering)"
  )
})
