import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/settings/page.tsx", "utf8")

// --- Saving sender info without required fields shows validation errors ---

test("handleSaveSender validates all three required fields before calling setBatch", () => {
  // Extract the handleSaveSender function body
  const fnMatch = source.match(
    /async function handleSaveSender\(e: React\.FormEvent\)\s*\{([\s\S]*?)\n  \}/
  )
  assert.ok(fnMatch, "handleSaveSender function exists")
  const fnBody = fnMatch[1]

  // Validates all three required fields
  assert.match(fnBody, /!senderName\.trim\(\)/, "checks senderName is not empty")
  assert.match(fnBody, /!senderEmail\.trim\(\)/, "checks senderEmail is not empty")
  assert.match(fnBody, /!senderAddress\.trim\(\)/, "checks senderAddress is not empty")

  // Sets errors and returns before calling setBatch
  assert.match(fnBody, /setSenderErrors\(errors\)/)
  assert.match(fnBody, /return/)

  // setBatch is called only after validation passes
  const returnIdx = fnBody.indexOf("return")
  const setBatchIdx = fnBody.indexOf("setBatch")
  assert.ok(returnIdx < setBatchIdx, "early return happens before setBatch call")
})

test("validation errors block the save mutation from executing", () => {
  const fnMatch = source.match(
    /async function handleSaveSender\(e: React\.FormEvent\)\s*\{([\s\S]*?)\n  \}/
  )
  const fnBody = fnMatch[1]

  // The pattern: if errors exist → set errors → return (no setBatch)
  const errorCheckPattern = /if \(Object\.keys\(errors\)\.length > 0\)\s*\{\s*setSenderErrors\(errors\)\s*return\s*\}/
  assert.match(fnBody, errorCheckPattern, "errors block save with early return")
})

test("each required field displays its specific error message below the input", () => {
  // Sender name error message
  assert.match(
    source,
    /senderErrors\.sender_name && \(\s*<p className="text-sm text-destructive">\{senderErrors\.sender_name\}<\/p>/,
    "sender_name error renders below input"
  )
  // Sender email error message
  assert.match(
    source,
    /senderErrors\.sender_email && \(\s*<p className="text-sm text-destructive">\{senderErrors\.sender_email\}<\/p>/,
    "sender_email error renders below input"
  )
  // Sender address error message
  assert.match(
    source,
    /senderErrors\.sender_address && \(\s*<p className="text-sm text-destructive">\{senderErrors\.sender_address\}<\/p>/,
    "sender_address error renders below input"
  )
})

test("error messages use the correct required-field text", () => {
  assert.match(source, /"Sender name is required"/, "sender_name error text")
  assert.match(source, /"Sender email is required"/, "sender_email error text")
  assert.match(source, /"Mailing address is required"/, "sender_address error text")
})

test("inputs get aria-invalid attribute when their field has an error", () => {
  assert.match(
    source,
    /id="sender_name"[\s\S]*?aria-invalid=\{!!senderErrors\.sender_name\}/,
    "sender_name input has aria-invalid"
  )
  assert.match(
    source,
    /id="sender_email"[\s\S]*?aria-invalid=\{!!senderErrors\.sender_email\}/,
    "sender_email input has aria-invalid"
  )
  assert.match(
    source,
    /id="sender_address"[\s\S]*?aria-invalid=\{!!senderErrors\.sender_address\}/,
    "sender_address input has aria-invalid"
  )
})

test("Input component styles aria-invalid inputs with destructive border", () => {
  const inputSource = fs.readFileSync("src/components/ui/input.tsx", "utf8")
  assert.match(inputSource, /aria-invalid:border-destructive/, "aria-invalid triggers red border")
})

test("typing in a field clears only that field's error", () => {
  // Sender name onChange clears its own error
  assert.match(
    source,
    /setSenderName\(e\.target\.value\)[\s\S]*?delete next\.sender_name/,
    "typing in sender_name clears sender_name error"
  )
  // Sender email onChange clears its own error
  assert.match(
    source,
    /setSenderEmail\(e\.target\.value\)[\s\S]*?delete next\.sender_email/,
    "typing in sender_email clears sender_email error"
  )
  // Sender address onChange clears its own error
  assert.match(
    source,
    /setSenderAddress\(e\.target\.value\)[\s\S]*?delete next\.sender_address/,
    "typing in sender_address clears sender_address error"
  )
})

test("email signature is optional and has no validation", () => {
  assert.doesNotMatch(source, /errors\.email_signature/, "no validation for email_signature")
  assert.doesNotMatch(
    source,
    /senderErrors\.email_signature/,
    "no error display for email_signature"
  )
})

test("successful save clears all sender errors", () => {
  const fnMatch = source.match(
    /async function handleSaveSender\(e: React\.FormEvent\)\s*\{([\s\S]*?)\n  \}/
  )
  const fnBody = fnMatch[1]

  // After validation passes, errors are cleared before save
  const clearIdx = fnBody.indexOf("setSenderErrors({})")
  const setBatchIdx = fnBody.indexOf("setBatch")
  assert.ok(clearIdx > -1, "errors are cleared on successful save")
  assert.ok(clearIdx < setBatchIdx, "errors are cleared before calling setBatch")
})
