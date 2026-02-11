import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/polygon-draw.tsx", "utf8")

test("is a client component", () => {
  assert.match(source, /^"use client"/)
})

test("imports leaflet-draw CSS", () => {
  assert.match(source, /import "leaflet-draw\/dist\/leaflet\.draw\.css"/)
})

test("imports useMap from react-leaflet", () => {
  assert.match(source, /import \{ useMap \} from "react-leaflet"/)
})

test("imports leaflet-draw", () => {
  assert.match(source, /import "leaflet-draw"/)
})

test("accepts isDrawing and onPolygonDrawn props", () => {
  assert.match(source, /isDrawing: boolean/)
  assert.match(source, /onPolygonDrawn: \(latlngs: \{ lat: number; lng: number \}\[\]\) => void/)
})

test("calls useMap() to access the map instance", () => {
  assert.match(source, /const map = useMap\(\)/)
})

test("stores draw handler in a ref", () => {
  assert.match(source, /useRef<L\.Draw\.Polygon \| null>/)
})

test("creates L.Draw.Polygon handler when isDrawing is true", () => {
  assert.match(source, /new L\.Draw\.Polygon\(map as unknown as L\.DrawMap/)
  assert.match(source, /handler\.enable\(\)/)
})

test("disables handler when isDrawing becomes false", () => {
  assert.match(source, /if \(!isDrawing\)/)
  assert.match(source, /handlerRef\.current\.disable\(\)/)
})

test("listens for L.Draw.Event.CREATED", () => {
  assert.match(source, /map\.on\(L\.Draw\.Event\.CREATED/)
})

test("extracts lat/lng from drawn polygon and calls onPolygonDrawn", () => {
  assert.match(source, /layer\.getLatLngs\(\)\[0\]/)
  assert.match(source, /lat: ll\.lat/)
  assert.match(source, /lng: ll\.lng/)
  assert.match(source, /onPolygonDrawn\(latlngs\)/)
})

test("removes drawn layer from map after extracting coordinates", () => {
  assert.match(source, /map\.removeLayer\(layer\)/)
})

test("cleans up event listener on unmount", () => {
  assert.match(source, /map\.off\(L\.Draw\.Event\.CREATED/)
})

test("disables handler on cleanup", () => {
  // The cleanup function in useEffect should disable the handler
  assert.match(source, /return \(\) => \{/)
  assert.match(source, /handlerRef\.current\.disable\(\)/)
})

test("exports PolygonDraw as named export", () => {
  assert.match(source, /export function PolygonDraw\(/)
})

test("renders null (no visual output)", () => {
  assert.match(source, /return null/)
})

test("useEffect depends on isDrawing, map, and onPolygonDrawn", () => {
  assert.match(source, /\}, \[isDrawing, map, onPolygonDrawn\]\)/)
})
