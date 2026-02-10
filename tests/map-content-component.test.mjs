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

test("uses CircleMarker and Popup from react-leaflet", () => {
  assert.match(source, /import\s+\{.*CircleMarker.*\}\s+from\s+"react-leaflet"/)
  assert.match(source, /import\s+\{.*Popup.*\}\s+from\s+"react-leaflet"/)
  assert.match(source, /<CircleMarker/)
  assert.match(source, /<Popup/)
})

test("centers on Niagara region (43.08, -79.08)", () => {
  assert.match(source, /43\.08/)
  assert.match(source, /-79\.08/)
})

test("imports getStatusColor from status-colors", () => {
  assert.match(source, /import\s+\{.*getStatusColor.*\}\s+from\s+["']\.\/status-colors["']/)
})

test("calls getStatusColor with lead status", () => {
  assert.match(source, /getStatusColor\(lead\.status\)/)
})

test("applies color to CircleMarker pathOptions", () => {
  assert.match(source, /fillColor:\s*color/)
  assert.match(source, /color:\s*color/)
  assert.match(source, /fillOpacity/)
})

test("maps over leads array to render markers", () => {
  assert.match(source, /leads\.map\(/)
  assert.match(source, /center=\{\[lead\.latitude,\s*lead\.longitude\]/)
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
