import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/lead-map.tsx", "utf8")

test("lead-map imports leaflet CSS", () => {
  assert.match(source, /import\s+"leaflet\/dist\/leaflet\.css"/)
})

test("lead-map uses MapContainer from react-leaflet", () => {
  assert.match(source, /import\s+\{.*MapContainer.*\}\s+from\s+"react-leaflet"/)
  assert.match(source, /<MapContainer/)
})

test("lead-map uses TileLayer with OpenStreetMap tiles", () => {
  assert.match(source, /import\s+\{.*TileLayer.*\}\s+from\s+"react-leaflet"/)
  assert.match(source, /<TileLayer/)
  assert.match(source, /tile\.openstreetmap\.org/)
})

test("lead-map defaults center to Niagara region (43.08, -79.08)", () => {
  assert.match(source, /43\.08/)
  assert.match(source, /-79\.08/)
  assert.match(source, /center=\{NIAGARA_CENTER\}/)
})

test("lead-map defaults zoom level to 8", () => {
  assert.match(source, /DEFAULT_ZOOM\s*=\s*8/)
  assert.match(source, /zoom=\{DEFAULT_ZOOM\}/)
})

test("lead-map is dynamically imported with ssr disabled", () => {
  assert.match(source, /import\s+dynamic\s+from\s+"next\/dynamic"/)
  assert.match(source, /dynamic\(/)
  assert.match(source, /ssr:\s*false/)
})

test("lead-map exports LeadMap component", () => {
  assert.match(source, /export\s+\{.*LeadMap/)
})
