import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/email-composer.tsx", "utf8")

// --- Subject is editable before saving ---

test("subject input is not read-only", () => {
  // The subject Input should have an onChange handler and value binding
  const subjectInput = source.match(/<Input[\s\S]*?id="email-subject"[\s\S]*?\/>/)
  assert.ok(subjectInput, "subject input should exist")
  assert.ok(!subjectInput[0].includes("readOnly"), "subject input should not be readOnly")
  assert.match(subjectInput[0], /onChange=/, "subject input should have onChange handler")
  assert.match(subjectInput[0], /value=\{subject\}/, "subject input should be bound to subject state")
})

test("body textarea is not read-only", () => {
  // The body Textarea should have an onChange handler and value binding
  const bodyInput = source.match(/<Textarea[\s\S]*?id="email-body"[\s\S]*?\/>/)
  assert.ok(bodyInput, "body textarea should exist")
  assert.ok(!bodyInput[0].includes("readOnly"), "body textarea should not be readOnly")
  assert.match(bodyInput[0], /onChange=/, "body textarea should have onChange handler")
  assert.match(bodyInput[0], /value=\{body\}/, "body textarea should be bound to body state")
})

// --- Editing updates state ---

test("subject onChange updates subject state via setSubject", () => {
  assert.match(source, /onChange=\{.*setSubject.*\}/, "subject onChange should call setSubject")
})

test("body onChange updates body state via setBody", () => {
  assert.match(source, /onChange=\{.*setBody.*\}/, "body onChange should call setBody")
})

// --- Subject and body are only disabled during generation ---

test("subject is disabled only during generation, not at rest", () => {
  const subjectInput = source.match(/<Input[\s\S]*?id="email-subject"[\s\S]*?\/>/)
  assert.ok(subjectInput, "subject input should exist")
  assert.match(subjectInput[0], /disabled=\{isGenerating\}/, "subject should only be disabled when isGenerating is true")
})

test("body is disabled only during generation, not at rest", () => {
  const bodyInput = source.match(/<Textarea[\s\S]*?id="email-body"[\s\S]*?\/>/)
  assert.ok(bodyInput, "body textarea should exist")
  assert.match(bodyInput[0], /disabled=\{isGenerating\}/, "body should only be disabled when isGenerating is true")
})

// --- Save Draft uses current state (edited values) ---

test("handleSaveDraft reads from subject and body state, not from generation result", () => {
  // Verify the save function uses the current state values (which may have been edited)
  const saveDraftFn = source.match(/function handleSaveDraft\(\)[\s\S]*?setIsOpen\(false\)\s*\}/)
  assert.ok(saveDraftFn, "handleSaveDraft function should exist")
  assert.match(saveDraftFn[0], /subject\.trim\(\)/, "should use subject state")
  assert.match(saveDraftFn[0], /body\.trim\(\)/, "should use body state")
  // Should NOT re-read from a generation result variable
  assert.ok(!saveDraftFn[0].includes("result.subject"), "should not use result.subject directly")
  assert.ok(!saveDraftFn[0].includes("result.body"), "should not use result.body directly")
})

test("saved draft contains subject and body from current state", () => {
  assert.match(source, /subject:\s*trimmedSubject/, "draft should store trimmed subject from state")
  assert.match(source, /body:\s*trimmedBody/, "draft should store trimmed body from state")
})

// --- User can edit after generation before saving ---

test("generation populates state which user can then modify before saving", () => {
  // Generation sets state values
  assert.match(source, /setSubject\(result\.subject\)/, "generation sets subject state")
  assert.match(source, /setBody\(result\.body\)/, "generation sets body state")
  // isGenerating is set back to false after generation, enabling editing
  assert.match(source, /finally\s*\{\s*setIsGenerating\(false\)/, "isGenerating resets to false after generation")
})

// --- Word count reflects edited content ---

test("word count is computed from current body state, reflecting edits", () => {
  assert.match(source, /const wordCount = countWords\(body\)/, "word count reads from body state directly")
})

// --- Save button enabled when content exists ---

test("hasContent check uses current state values for save button", () => {
  assert.match(source, /const hasContent = subject\.trim\(\)\.length > 0 && body\.trim\(\)\.length > 0/, "hasContent checks current subject and body state")
})
