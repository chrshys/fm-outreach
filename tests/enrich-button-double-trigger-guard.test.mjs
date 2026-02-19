import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// Extract handleEnrichCell function body
const fnStart = source.indexOf("const handleEnrichCell")
const fnEnd = source.indexOf("}, [persistedCell, cellLeadIdsForEnrichment, enrichCellLeads])")
const fnBody = source.slice(fnStart, fnEnd)

// ============================================================
// Ref-based guard: isEnrichingRef exists
// ============================================================

test("isEnrichingRef is declared with useRef(false)", () => {
  assert.match(source, /const\s+isEnrichingRef\s*=\s*useRef\(false\)/)
})

// ============================================================
// handleEnrichCell checks ref synchronously before proceeding
// ============================================================

test("handleEnrichCell returns early if isEnrichingRef.current is true", () => {
  assert.ok(
    fnBody.includes("if (isEnrichingRef.current) return"),
    "Should check isEnrichingRef.current and return early to prevent double-trigger",
  )
})

test("isEnrichingRef.current is set to true before setIsEnriching(true)", () => {
  const refSetIdx = fnBody.indexOf("isEnrichingRef.current = true")
  const stateSetIdx = fnBody.indexOf("setIsEnriching(true)")

  assert.ok(refSetIdx !== -1, "Should find isEnrichingRef.current = true")
  assert.ok(stateSetIdx !== -1, "Should find setIsEnriching(true)")
  assert.ok(
    refSetIdx < stateSetIdx,
    "isEnrichingRef.current = true must come BEFORE setIsEnriching(true) for synchronous guard",
  )
})

test("isEnrichingRef.current guard comes before await enrichCellLeads", () => {
  const guardIdx = fnBody.indexOf("if (isEnrichingRef.current) return")
  const awaitIdx = fnBody.indexOf("await enrichCellLeads(")

  assert.ok(guardIdx !== -1, "Should find ref guard")
  assert.ok(awaitIdx !== -1, "Should find await enrichCellLeads")
  assert.ok(
    guardIdx < awaitIdx,
    "Ref guard must be checked BEFORE the async enrichment call",
  )
})

// ============================================================
// Ref is reset in finally block
// ============================================================

test("isEnrichingRef.current is reset to false in finally block", () => {
  const finallyStart = fnBody.indexOf("} finally {")
  assert.ok(finallyStart !== -1, "Should have a finally block")

  const finallyBody = fnBody.slice(finallyStart)
  assert.ok(
    finallyBody.includes("isEnrichingRef.current = false"),
    "isEnrichingRef.current should be reset to false in the finally block",
  )
})

test("isEnrichingRef reset comes before setIsEnriching(false) in finally", () => {
  const finallyStart = fnBody.indexOf("} finally {")
  const finallyBody = fnBody.slice(finallyStart)

  const refResetIdx = finallyBody.indexOf("isEnrichingRef.current = false")
  const stateResetIdx = finallyBody.indexOf("setIsEnriching(false)")

  assert.ok(refResetIdx !== -1, "Should find ref reset in finally")
  assert.ok(stateResetIdx !== -1, "Should find state reset in finally")
  assert.ok(
    refResetIdx < stateResetIdx,
    "Ref reset should come before state reset in finally block",
  )
})
