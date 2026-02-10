import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))

test("leaflet is listed as a dependency", () => {
  assert.ok(pkg.dependencies.leaflet, "leaflet should be in dependencies")
})

test("react-leaflet is listed as a dependency", () => {
  assert.ok(pkg.dependencies["react-leaflet"], "react-leaflet should be in dependencies")
})

test("@types/leaflet is listed as a devDependency", () => {
  assert.ok(pkg.devDependencies["@types/leaflet"], "@types/leaflet should be in devDependencies")
})

test("leaflet package is installed in node_modules", () => {
  const leafletPkg = path.resolve("node_modules/leaflet/package.json")
  assert.ok(fs.existsSync(leafletPkg), "leaflet package.json should exist in node_modules")
})

test("react-leaflet package is installed in node_modules", () => {
  const rlPkg = path.resolve("node_modules/react-leaflet/package.json")
  assert.ok(fs.existsSync(rlPkg), "react-leaflet package.json should exist in node_modules")
})

test("@types/leaflet package is installed in node_modules", () => {
  const typesPkg = path.resolve("node_modules/@types/leaflet/package.json")
  assert.ok(fs.existsSync(typesPkg), "@types/leaflet package.json should exist in node_modules")
})
