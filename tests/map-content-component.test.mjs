import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("imports leaflet CSS", () => {
  assert.match(source, /import\s+"leaflet\/dist\/leaflet\.css"/)
})

test("uses MapContainer from react-leaflet", () => {
  assert.match(source, /import\s+\{.*MapContainer.*\}\s+from\s+"react-leaflet"/)
  assert.match(source, /<MapContainer/)
})

test("uses TileLayer with OpenStreetMap tiles", () => {
  assert.match(source, /import\s+\{.*TileLayer.*\}\s+from\s+"react-leaflet"/)
  assert.match(source, /<TileLayer/)
  assert.match(source, /tile\.openstreetmap\.org/)
})

test("uses Marker and Popup from react-leaflet", () => {
  assert.match(source, /import\s+\{.*Marker.*\}\s+from\s+"react-leaflet"/)
  assert.match(source, /import\s+\{.*Popup.*\}\s+from\s+"react-leaflet"/)
  assert.match(source, /<Marker/)
  assert.match(source, /<Popup/)
})

test("centers on Niagara region (43.08, -79.08)", () => {
  assert.match(source, /43\.08/)
  assert.match(source, /-79\.08/)
})

test("configures default Leaflet marker icon", () => {
  assert.match(source, /L\.icon\(/)
  assert.match(source, /iconUrl/)
  assert.match(source, /marker-icon\.png/)
})

test("maps over leads array to render markers", () => {
  assert.match(source, /leads\.map\(/)
  assert.match(source, /position=\{\[lead\.latitude,\s*lead\.longitude\]/)
})

test("shows lead name and type in popup", () => {
  assert.match(source, /lead\.name/)
  assert.match(source, /lead\.city/)
})

test("exports MapContent as default export", () => {
  assert.match(source, /export\s+default\s+function\s+MapContent/)
})

test("accepts leads prop with typed LeadMarker array", () => {
  assert.match(source, /leads:\s*LeadMarker\[\]/)
})
