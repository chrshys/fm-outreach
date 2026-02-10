import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/settings/page.tsx", "utf8")
const settingsSource = fs.readFileSync("convex/settings.ts", "utf8")
const schemaSource = fs.readFileSync("convex/schema.ts", "utf8")

// --- End-to-end persistence: schema → mutation → page wiring ---

test("settings table exists in schema with key-value design", () => {
  assert.match(schemaSource, /settings:\s*defineTable\(\{/)
  assert.match(schemaSource, /key:\s*v\.string\(\)/)
  assert.match(schemaSource, /value:\s*v\.string\(\)/)
  assert.match(schemaSource, /\.index\("by_key",\s*\["key"\]\)/)
})

test("setBatch mutation upserts each item using by_key index", () => {
  const setBatchBlock = settingsSource.slice(
    settingsSource.indexOf("export const setBatch"),
    settingsSource.indexOf("export const remove")
  )
  // Iterates items
  assert.match(setBatchBlock, /for\s*\(const item of args\.items\)/)
  // Looks up existing by key index
  assert.match(setBatchBlock, /\.withIndex\("by_key"/)
  // Patches existing
  assert.match(setBatchBlock, /ctx\.db\.patch\(existing\._id,\s*\{\s*value:\s*item\.value\s*\}/)
  // Inserts new
  assert.match(setBatchBlock, /ctx\.db\.insert\("settings",\s*\{\s*key:\s*item\.key,\s*value:\s*item\.value\s*\}/)
})

// --- Page loads all settings and hydrates API key fields ---

test("page queries all settings via getAll on mount", () => {
  assert.match(pageSource, /const settings = useQuery\(api\.settings\.getAll\)/)
})

test("useEffect hydrates all four API key fields from query result", () => {
  // Extract the useEffect block
  const effectStart = pageSource.indexOf("useEffect(() => {")
  assert.ok(effectStart > -1, "useEffect block exists")
  const effectBlock = pageSource.slice(effectStart, effectStart + 500)

  assert.match(effectBlock, /settings\.smartlead_api_key/)
  assert.match(effectBlock, /settings\.google_places_api_key/)
  assert.match(effectBlock, /settings\.hunter_api_key/)
  assert.match(effectBlock, /settings\.anthropic_api_key/)
})

test("useEffect guards against undefined settings", () => {
  const effectStart = pageSource.indexOf("useEffect(() => {")
  const effectBlock = pageSource.slice(effectStart, effectStart + 200)
  assert.match(effectBlock, /if\s*\(!settings\)\s*return/)
})

// --- Save handler maps all API key fields to setBatch items ---

test("handleSaveApiKeys maps all four API key fields to setBatch items", () => {
  const handlerStart = pageSource.indexOf("async function handleSaveApiKeys")
  assert.ok(handlerStart > -1, "handleSaveApiKeys exists")
  const handlerBlock = pageSource.slice(handlerStart, handlerStart + 400)

  // Maps API_KEY_FIELDS to items array
  assert.match(handlerBlock, /API_KEY_FIELDS\.map/)
  // Passes items to setBatch
  assert.match(handlerBlock, /await setBatch\(\{\s*items\s*\}/)
})

test("API_KEY_FIELDS constant defines all four expected keys", () => {
  const fieldsStart = pageSource.indexOf("const API_KEY_FIELDS")
  const fieldsBlock = pageSource.slice(fieldsStart, pageSource.indexOf("] as const", fieldsStart) + 10)

  assert.match(fieldsBlock, /key:\s*"smartlead_api_key"/)
  assert.match(fieldsBlock, /key:\s*"google_places_api_key"/)
  assert.match(fieldsBlock, /key:\s*"hunter_api_key"/)
  assert.match(fieldsBlock, /key:\s*"anthropic_api_key"/)
})

// --- Save handler manages loading state ---

test("handleSaveApiKeys sets saving state before and after mutation", () => {
  const handlerStart = pageSource.indexOf("async function handleSaveApiKeys")
  const handlerBlock = pageSource.slice(handlerStart, handlerStart + 400)

  assert.match(handlerBlock, /setSavingApiKeys\(true\)/)
  assert.match(handlerBlock, /setSavingApiKeys\(false\)/)
})

test("save button is disabled while saving API keys", () => {
  assert.match(pageSource, /disabled=\{savingApiKeys\}/)
})

// --- Form submit is wired to handler ---

test("API keys form onSubmit calls handleSaveApiKeys", () => {
  assert.match(pageSource, /onSubmit=\{.*handleSaveApiKeys/)
})

// --- Reload shows saved values (reactive query) ---

test("getAll query returns key-value object from all settings rows", () => {
  const getAllBlock = settingsSource.slice(
    settingsSource.indexOf("export const getAll"),
    settingsSource.indexOf("export const set")
  )
  // Collects all rows and converts to object
  assert.match(getAllBlock, /ctx\.db\.query\("settings"\)\.collect\(\)/)
  assert.match(getAllBlock, /Object\.fromEntries/)
})

test("each API key input is controlled by apiKeys state", () => {
  // The input value is bound to apiKeys[field.key]
  assert.match(pageSource, /value=\{apiKeys\[field\.key\]\}/)
  // onChange updates apiKeys state
  assert.match(pageSource, /setApiKeys\(/)
})
