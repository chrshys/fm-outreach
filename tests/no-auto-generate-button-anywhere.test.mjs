import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

/**
 * Validates that no "Auto-generate Clusters" button or autoGenerate action
 * reference exists anywhere in application source code (src/ and convex/).
 */

function collectFiles(dir, extensions) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "_generated") {
      results.push(...collectFiles(full, extensions))
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full)
    }
  }
  return results
}

const srcFiles = collectFiles("src", [".tsx", ".ts", ".jsx", ".js"])
const convexFiles = collectFiles("convex", [".ts", ".js"])
const allFiles = [...srcFiles, ...convexFiles]

test("no application source file contains 'Auto-generate Clusters' button text", () => {
  for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf8")
    assert.ok(
      !content.includes("Auto-generate Clusters"),
      `Found "Auto-generate Clusters" in ${file}`,
    )
    assert.ok(
      !content.includes("Auto-generate clusters"),
      `Found "Auto-generate clusters" in ${file}`,
    )
  }
})

test("no application source file imports or references autoGenerate action", () => {
  for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf8")
    assert.ok(
      !content.includes("api.clusters.autoGenerate"),
      `Found "api.clusters.autoGenerate" reference in ${file}`,
    )
  }
})

test("convex/clusters.ts does not export autoGenerate", () => {
  const source = fs.readFileSync("convex/clusters.ts", "utf8")
  assert.ok(
    !source.includes("export const autoGenerate"),
    "autoGenerate should not be exported from clusters.ts",
  )
})

test("no application source file uses useAction for cluster auto-generation", () => {
  for (const file of srcFiles) {
    const content = fs.readFileSync(file, "utf8")
    if (content.includes("useAction") && content.includes("clusters")) {
      assert.ok(
        !content.includes("autoGenerate"),
        `Found useAction + autoGenerate reference in ${file}`,
      )
    }
  }
})

test("clusters page specifically has no auto-generate button", () => {
  const source = fs.readFileSync("src/app/clusters/page.tsx", "utf8")
  assert.ok(
    !source.includes("Auto-generate"),
    "Clusters page should not reference Auto-generate",
  )
  assert.ok(
    !source.includes("autoGenerate"),
    "Clusters page should not reference autoGenerate",
  )
})
