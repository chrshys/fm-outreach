import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("imports useMutation from convex/react", () => {
  assert.match(source, /import\s+\{.*useMutation.*\}\s+from\s+"convex\/react"/)
})

test("declares activateCell mutation from api.discovery.gridCells", () => {
  assert.match(source, /const\s+activateCell\s*=\s*useMutation\(api\.discovery\.gridCells\.activateCell\)/)
})

test("declares getOrCreateGlobalGrid mutation from api.discovery.gridCells", () => {
  assert.match(source, /const\s+getOrCreateGlobalGrid\s*=\s*useMutation\(api\.discovery\.gridCells\.getOrCreateGlobalGrid\)/)
})
