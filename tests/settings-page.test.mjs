import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/settings/page.tsx", "utf8")

test("wraps the settings page content with AppLayout", () => {
  assert.match(source, /import\s+\{\s*AppLayout\s*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout>[\s\S]*<\/AppLayout>/)
})

test("is a client component", () => {
  assert.match(source, /"use client"/)
})

test("fetches settings with useQuery on getAll", () => {
  assert.match(source, /import\s+\{.*useQuery.*\}\s+from\s+"convex\/react"/)
  assert.match(source, /useQuery\(api\.settings\.getAll\)/)
})

test("uses setBatch mutation for saving", () => {
  assert.match(source, /useMutation\(api\.settings\.setBatch\)/)
})

test("renders two-card grid layout", () => {
  assert.match(source, /lg:grid-cols-2/)
})

test("renders API Keys card with title and description", () => {
  assert.match(source, /API Keys/)
  assert.match(source, /Configure API keys for external services/)
})

test("renders Sender Identity card with title and description", () => {
  assert.match(source, /Sender Identity/)
  assert.match(source, /Configure your sender profile for outbound emails/)
})

test("has all four API key fields", () => {
  assert.match(source, /smartlead_api_key/)
  assert.match(source, /google_places_api_key/)
  assert.match(source, /hunter_api_key/)
  assert.match(source, /anthropic_api_key/)
})

test("API key fields use password type by default", () => {
  assert.match(source, /type=\{visibleKeys\[field\.key\] \? "text" : "password"\}/)
})

test("has show/hide toggle with Eye icons", () => {
  assert.match(source, /import\s+\{.*Eye.*EyeOff.*\}\s+from\s+"lucide-react"/)
  assert.match(source, /<Eye/)
  assert.match(source, /<EyeOff/)
})

test("toggle button has accessible label", () => {
  assert.match(source, /aria-label=/)
  assert.match(source, /Hide value/)
  assert.match(source, /Show value/)
})

test("has sender name field", () => {
  assert.match(source, /id="sender_name"/)
  assert.match(source, /Sender Name/)
})

test("has sender email field with email type", () => {
  assert.match(source, /id="sender_email"/)
  assert.match(source, /type="email"/)
  assert.match(source, /Sender Email/)
})

test("has mailing address field with CASL note and required attribute", () => {
  assert.match(source, /id="sender_address"/)
  assert.match(source, /Mailing Address/)
  assert.match(source, /required for CASL/)
  assert.match(source, /required/)
})

test("has email signature textarea", () => {
  assert.match(source, /id="email_signature"/)
  assert.match(source, /Email Signature/)
  assert.match(source, /<Textarea/)
})

test("has save button for each card", () => {
  assert.match(source, /Save API Keys/)
  assert.match(source, /Save Sender Identity/)
})

test("loads existing values from settings on mount via useEffect", () => {
  assert.match(source, /useEffect\(/)
  assert.match(source, /settings\.smartlead_api_key/)
  assert.match(source, /settings\.sender_name/)
})

test("shows loading state while settings are undefined", () => {
  assert.match(source, /settings === undefined/)
  assert.match(source, /Loader2/)
})

test("disables save buttons while saving", () => {
  assert.match(source, /disabled=\{savingApiKeys\}/)
  assert.match(source, /disabled=\{savingSender\}/)
})

test("uses setBatch to persist API keys", () => {
  assert.match(source, /handleSaveApiKeys/)
  assert.match(source, /await setBatch\(\{ items/)
})

test("uses setBatch to persist sender identity", () => {
  assert.match(source, /handleSaveSender/)
  assert.match(source, /key: "sender_name"/)
  assert.match(source, /key: "sender_email"/)
  assert.match(source, /key: "sender_address"/)
  assert.match(source, /key: "email_signature"/)
})
