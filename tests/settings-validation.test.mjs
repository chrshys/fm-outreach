import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/settings/page.tsx", "utf8")

// --- Sender Identity validation ---

test("tracks sender validation errors in state", () => {
  assert.match(source, /useState<Record<string, string>>\(\{\}\)/)
  assert.match(source, /senderErrors/)
})

test("validates sender name is required on save", () => {
  assert.match(source, /!senderName\.trim\(\)/)
  assert.match(source, /errors\.sender_name\s*=\s*"Sender name is required"/)
})

test("validates sender email is required on save", () => {
  assert.match(source, /!senderEmail\.trim\(\)/)
  assert.match(source, /errors\.sender_email\s*=\s*"Sender email is required"/)
})

test("validates mailing address is required on save", () => {
  assert.match(source, /!senderAddress\.trim\(\)/)
  assert.match(source, /errors\.sender_address\s*=\s*"Mailing address is required"/)
})

test("prevents save when validation errors exist", () => {
  assert.match(source, /if \(Object\.keys\(errors\)\.length > 0\)/)
  assert.match(source, /setSenderErrors\(errors\)/)
  assert.match(source, /return/)
})

test("clears errors before successful save", () => {
  assert.match(source, /setSenderErrors\(\{\}\)/)
})

test("shows inline error messages for each required sender field", () => {
  // Each field has a conditional error <p> tag
  assert.match(source, /senderErrors\.sender_name && \([\s\S]*?text-sm text-destructive[\s\S]*?senderErrors\.sender_name/)
  assert.match(source, /senderErrors\.sender_email && \([\s\S]*?text-sm text-destructive[\s\S]*?senderErrors\.sender_email/)
  assert.match(source, /senderErrors\.sender_address && \([\s\S]*?text-sm text-destructive[\s\S]*?senderErrors\.sender_address/)
})

test("sets aria-invalid on sender name input when error exists", () => {
  assert.match(source, /id="sender_name"[\s\S]*?aria-invalid=\{!!senderErrors\.sender_name\}/)
})

test("sets aria-invalid on sender email input when error exists", () => {
  assert.match(source, /id="sender_email"[\s\S]*?aria-invalid=\{!!senderErrors\.sender_email\}/)
})

test("sets aria-invalid on sender address input when error exists", () => {
  assert.match(source, /id="sender_address"[\s\S]*?aria-invalid=\{!!senderErrors\.sender_address\}/)
})

test("clears sender_name error when user types in the field", () => {
  assert.match(source, /setSenderName\(e\.target\.value\)[\s\S]*?delete next\.sender_name/)
})

test("clears sender_email error when user types in the field", () => {
  assert.match(source, /setSenderEmail\(e\.target\.value\)[\s\S]*?delete next\.sender_email/)
})

test("clears sender_address error when user types in the field", () => {
  assert.match(source, /setSenderAddress\(e\.target\.value\)[\s\S]*?delete next\.sender_address/)
})

test("email signature is not validated as required", () => {
  assert.doesNotMatch(source, /errors\.email_signature/)
})

// --- API Keys "Not configured" indicator ---

test("imports Badge component", () => {
  assert.match(source, /import\s+\{\s*Badge\s*\}\s+from\s+"@\/components\/ui\/badge"/)
})

test("shows 'Not configured' badge when API key is empty", () => {
  assert.match(source, /!apiKeys\[field\.key\]/)
  assert.match(source, /Not configured/)
})

test("uses outline variant for the not-configured badge", () => {
  assert.match(source, /variant="outline"/)
  assert.match(source, /text-muted-foreground/)
})

test("API keys are optional — no validation errors for empty keys", () => {
  assert.doesNotMatch(source, /errors\.smartlead_api_key/)
  assert.doesNotMatch(source, /errors\.google_places_api_key/)
  assert.doesNotMatch(source, /errors\.hunter_api_key/)
  assert.doesNotMatch(source, /errors\.anthropic_api_key/)
})
