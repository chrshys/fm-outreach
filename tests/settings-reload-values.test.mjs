import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/settings/page.tsx", "utf8")
const settingsSource = fs.readFileSync("convex/settings.ts", "utf8")

// Extract the useEffect block for reuse
const effectStart = pageSource.indexOf("useEffect(() => {")
const effectEnd = pageSource.indexOf("}, [settings])")
const effectBlock = pageSource.slice(effectStart, effectEnd + 15)

// --- Settings query fires on mount ---

test("page subscribes to getAll query for reactive reload", () => {
  assert.match(pageSource, /const settings = useQuery\(api\.settings\.getAll\)/)
})

// --- useEffect hydrates all fields on reload ---

test("useEffect depends on settings to re-run when data arrives", () => {
  assert.match(effectBlock, /\}, \[settings\]\)/)
})

test("useEffect skips hydration when settings is undefined (still loading)", () => {
  assert.match(effectBlock, /if \(!settings\) return/)
})

// --- API key fields hydrated with nullish coalescing ---

test("useEffect hydrates smartlead_api_key with fallback to empty string", () => {
  assert.match(effectBlock, /settings\.smartlead_api_key \?\? ""/)
})

test("useEffect hydrates google_places_api_key with fallback to empty string", () => {
  assert.match(effectBlock, /settings\.google_places_api_key \?\? ""/)
})

test("useEffect hydrates hunter_api_key with fallback to empty string", () => {
  assert.match(effectBlock, /settings\.hunter_api_key \?\? ""/)
})

test("useEffect hydrates anthropic_api_key with fallback to empty string", () => {
  assert.match(effectBlock, /settings\.anthropic_api_key \?\? ""/)
})

// --- Sender identity fields hydrated with nullish coalescing ---

test("useEffect hydrates sender_name with fallback to empty string", () => {
  assert.match(effectBlock, /setSenderName\(settings\.sender_name \?\? ""\)/)
})

test("useEffect hydrates sender_email with fallback to empty string", () => {
  assert.match(effectBlock, /setSenderEmail\(settings\.sender_email \?\? ""\)/)
})

test("useEffect hydrates sender_address with fallback to empty string", () => {
  assert.match(effectBlock, /setSenderAddress\(settings\.sender_address \?\? ""\)/)
})

test("useEffect hydrates email_signature with fallback to empty string", () => {
  assert.match(effectBlock, /setEmailSignature\(settings\.email_signature \?\? ""\)/)
})

// --- All 8 setting keys are covered (4 API keys + 4 sender fields) ---

test("useEffect hydrates all 8 setting fields in a single effect", () => {
  // API keys set via setApiKeys object
  assert.match(effectBlock, /setApiKeys\(\{/)
  // Sender fields set individually
  assert.match(effectBlock, /setSenderName\(/)
  assert.match(effectBlock, /setSenderEmail\(/)
  assert.match(effectBlock, /setSenderAddress\(/)
  assert.match(effectBlock, /setEmailSignature\(/)
})

// --- Loading state prevents rendering stale empty form ---

test("page shows loading spinner while settings query is undefined", () => {
  assert.match(pageSource, /if \(settings === undefined\)/)
  assert.match(pageSource, /Loader2.*animate-spin/)
})

// --- getAll query returns all settings as a flat key-value map ---

test("getAll query collects all rows and returns key-value object", () => {
  const getAllBlock = settingsSource.slice(
    settingsSource.indexOf("export const getAll"),
    settingsSource.indexOf("export const set")
  )
  assert.match(getAllBlock, /ctx\.db\.query\("settings"\)\.collect\(\)/)
  assert.match(getAllBlock, /Object\.fromEntries\(rows\.map\(/)
})

// --- Sender inputs are controlled by state (so hydration reflects in UI) ---

test("sender name input value is bound to state", () => {
  assert.match(pageSource, /id="sender_name"[\s\S]*?value=\{senderName\}/)
})

test("sender email input value is bound to state", () => {
  assert.match(pageSource, /id="sender_email"[\s\S]*?value=\{senderEmail\}/)
})

test("sender address input value is bound to state", () => {
  assert.match(pageSource, /id="sender_address"[\s\S]*?value=\{senderAddress\}/)
})

test("email signature textarea value is bound to state", () => {
  assert.match(pageSource, /id="email_signature"[\s\S]*?value=\{emailSignature\}/)
})
