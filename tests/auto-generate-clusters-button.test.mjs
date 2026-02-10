import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/clusters/page.tsx", "utf8")

test("imports useAction from convex/react", () => {
  assert.match(source, /import\s+\{.*useAction.*\}\s+from\s+"convex\/react"/)
})

test("calls useAction with api.clusters.autoGenerate", () => {
  assert.match(source, /useAction\(api\.clusters\.autoGenerate\)/)
})

test("tracks isGenerating loading state", () => {
  assert.match(source, /useState\(false\)/)
  assert.match(source, /isGenerating/)
  assert.match(source, /setIsGenerating/)
})

test("button is disabled while generating", () => {
  assert.match(source, /disabled=\{isGenerating\}/)
})

test("button shows loading spinner when generating", () => {
  assert.match(source, /Loader2/)
  assert.match(source, /animate-spin/)
  assert.match(source, /Generating\.\.\./)
})

test("handleAutoGenerate calls autoGenerate action and shows result", () => {
  assert.match(source, /async function handleAutoGenerate/)
  assert.match(source, /await autoGenerate\(\)/)
  assert.match(source, /result\.clustersCreated/)
  assert.match(source, /result\.leadsAssigned/)
})

test("shows result message after generation", () => {
  assert.match(source, /generateResult/)
  assert.match(source, /setGenerateResult/)
  assert.match(source, /Created.*clusters.*assigned.*leads/)
})

test("handles errors during generation", () => {
  assert.match(source, /Failed to generate clusters/)
})

test("clears selected cluster before generating", () => {
  // The handler should clear selection since clusters will be regenerated
  assert.match(source, /setSelectedClusterId\(null\)/)
})
