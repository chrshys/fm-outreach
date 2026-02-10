import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/[id]/page.tsx", "utf8")

// --- Imports ---

test("imports Sparkles icon from lucide-react", () => {
  assert.match(source, /import\s+\{[\s\S]*Sparkles[\s\S]*\}\s+from\s+"lucide-react"/)
})

test("calls useAction with batchGenerate action", () => {
  assert.match(source, /useAction\(api\.email\.batchGenerate\.batchGenerate\)/)
})

// --- State ---

test("has showGenerateDialog state", () => {
  assert.match(source, /showGenerateDialog/)
  assert.match(source, /setShowGenerateDialog/)
})

test("has isGenerating state for loading indicator", () => {
  assert.match(source, /isGenerating/)
  assert.match(source, /setIsGenerating/)
})

// --- Button rendering ---

test("renders Generate Emails button only for draft campaigns with no emails", () => {
  assert.match(source, /Generate Emails/)
  assert.match(source, /campaign\.status === "draft" && emails\.length === 0/)
})

test("Generate Emails button opens the confirmation dialog", () => {
  assert.match(source, /onClick=\{.*setShowGenerateDialog\(true\).*\}/)
})

test("Generate Emails button uses Sparkles icon", () => {
  assert.match(source, /<Sparkles[\s\S]*?>[\s\S]*?Generate Emails/)
})

// --- Confirmation dialog ---

test("renders Dialog with open controlled by showGenerateDialog", () => {
  assert.match(source, /<Dialog\s+open=\{showGenerateDialog\}\s+onOpenChange=\{setShowGenerateDialog\}/)
})

test("dialog has title Generate Emails", () => {
  assert.match(source, /<DialogTitle>Generate Emails<\/DialogTitle>/)
})

test("dialog description mentions AI personalization and lead count", () => {
  assert.match(source, /use AI to generate personalized emails/)
  assert.match(source, /campaign\.leadCount/)
  assert.match(source, /review and edit them before sending/)
})

test("dialog has Cancel button that closes the dialog", () => {
  assert.match(source, /setShowGenerateDialog\(false\)/)
})

test("dialog has Confirm Generate button that calls handleGenerateEmails", () => {
  assert.match(source, /Confirm Generate/)
  assert.match(source, /handleGenerateEmails/)
})

test("shows spinner when generating", () => {
  assert.match(source, /isGenerating \?[\s\S]*?Loader2[\s\S]*?animate-spin[\s\S]*?Sparkles/)
})

test("button text changes to Generating while in progress", () => {
  assert.match(source, /isGenerating \? "Generating…" : "Confirm Generate"/)
})

// --- handleGenerateEmails function ---

test("handleGenerateEmails sets isGenerating true before calling action", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn, "handleGenerateEmails function should exist")
  assert.match(fn[0], /setIsGenerating\(true\)/)
})

test("handleGenerateEmails calls batchGenerateAction with campaignId", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /batchGenerateAction\(\{\s*campaignId\s*\}\)/)
})

test("handleGenerateEmails closes dialog on success", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /setShowGenerateDialog\(false\)/)
})

test("handleGenerateEmails shows success toast with succeeded count", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /toast\.success/)
  assert.match(fn[0], /result\.succeeded/)
})

test("handleGenerateEmails shows skipped count when present", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /result\.skipped/)
})

test("handleGenerateEmails shows failed count when present", () => {
  const fn = source.match(/async function handleGenerateEmails[\s\S]*?finally[\s\S]*?\}[\s\n]*\}/)
  assert.ok(fn)
  assert.match(fn[0], /result\.failed/)
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
