import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/[id]/preview/page.tsx", "utf8")

// --- Imports ---

test("imports Sparkles icon from lucide-react", () => {
  assert.match(source, /import\s+\{[\s\S]*Sparkles[\s\S]*\}\s+from\s+"lucide-react"/)
})

test("calls useAction with batchGenerate action", () => {
  assert.match(source, /useAction\(api\.email\.batchGenerate\.batchGenerate\)/)
})

// --- State ---

test("has isGenerating state for loading indicator", () => {
  assert.match(source, /isGenerating/)
  assert.match(source, /setIsGenerating/)
})

// --- handleGenerateEmails function ---

test("handleGenerateEmails function exists", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn, "handleGenerateEmails function should exist")
})

test("handleGenerateEmails sets isGenerating true before calling action", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /setIsGenerating\(true\)/)
})

test("handleGenerateEmails calls batchGenerateAction with campaignId", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /batchGenerateAction\(\{\s*campaignId\s*\}\)/)
})

test("handleGenerateEmails shows success toast with succeeded count", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /toast\.success/)
  assert.match(fn[0], /result\.succeeded/)
})

test("handleGenerateEmails shows error toast on failure", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /toast\.error/)
})

test("handleGenerateEmails resets isGenerating in finally block", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /finally[\s\S]*?setIsGenerating\(false\)/)
})

// --- Empty state with generate button ---

test("empty state shows Generate Emails button for draft campaigns", () => {
  assert.match(source, /No emails generated yet/)
  assert.match(source, /campaign\.status === "draft"/)
})

test("empty state generate button calls handleGenerateEmails", () => {
  // The button in the empty state should call handleGenerateEmails
  assert.match(source, /handleGenerateEmails/)
})

test("empty state generate button is disabled while generating", () => {
  assert.match(source, /disabled=\{isGenerating\}/)
})

test("empty state generate button shows spinner when generating", () => {
  // Within the empty state block
  const emptyState = source.match(/No emails generated yet[\s\S]*?<\/Card>/)
  assert.ok(emptyState, "empty state section should exist")
  assert.match(emptyState[0], /isGenerating/)
  assert.match(emptyState[0], /Loader2/)
  assert.match(emptyState[0], /Sparkles/)
})

test("empty state generate button text changes while generating", () => {
  const emptyState = source.match(/No emails generated yet[\s\S]*?<\/Card>/)
  assert.ok(emptyState)
  assert.match(emptyState[0], /isGenerating \? "Generating…" : "Generate Emails"/)
})
