import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

// Verify files that previously had unnecessary @ts-expect-error directives
// no longer contain them (the underlying type issues were resolved).

test("cluster-detail.tsx has no stale @ts-expect-error for boundary types", () => {
  const source = fs.readFileSync(
    "src/components/clusters/cluster-detail.tsx",
    "utf8",
  )
  const lines = source.split("\n")
  const staleDirective = lines.find(
    (line) =>
      line.includes("@ts-expect-error") &&
      line.includes("boundary"),
  )
  assert.equal(
    staleDirective,
    undefined,
    `Found stale @ts-expect-error for boundary types: ${staleDirective}`,
  )
})

test("enrich-leads.ts has no stale @ts-expect-error for deep type instantiation", () => {
  const source = fs.readFileSync("scripts/enrich-leads.ts", "utf8")
  const lines = source.split("\n")
  const staleDirective = lines.find(
    (line) =>
      line.includes("@ts-expect-error") &&
      line.includes("deep type instantiation"),
  )
  assert.equal(
    staleDirective,
    undefined,
    `Found stale @ts-expect-error: ${staleDirective}`,
  )
})

test("clusters/page.tsx has no stale @ts-expect-error for boundary types", () => {
  const source = fs.readFileSync("src/app/clusters/page.tsx", "utf8")
  const lines = source.split("\n")
  const staleDirective = lines.find(
    (line) =>
      line.includes("@ts-expect-error") &&
      line.includes("boundary"),
  )
  assert.equal(
    staleDirective,
    undefined,
    `Found stale @ts-expect-error for boundary types: ${staleDirective}`,
  )
})
