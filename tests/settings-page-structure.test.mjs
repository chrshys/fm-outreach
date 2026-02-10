import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/settings/page.tsx", "utf8")

// --- Page renders with two form cards and a documentation section ---

test("page contains exactly two form cards", () => {
  const forms = source.match(/<form /g)
  assert.equal(forms.length, 2, "Expected exactly 2 <form> elements")
})

test("page contains exactly three Card components", () => {
  // Opening <Card> or <Card className=...> tags (not CardHeader, CardTitle, etc.)
  const cards = source.match(/<Card[\s>]/g)
  assert.equal(cards.length, 3, "Expected exactly 3 Card components")
})

test("first form card is API Keys", () => {
  const apiKeysIndex = source.indexOf("API Keys</CardTitle>")
  const senderIndex = source.indexOf("Sender Identity</CardTitle>")
  assert.ok(apiKeysIndex > -1, "API Keys card must exist")
  assert.ok(apiKeysIndex < senderIndex, "API Keys card should appear before Sender Identity")
})

test("second form card is Sender Identity", () => {
  const senderIndex = source.indexOf("Sender Identity</CardTitle>")
  const domainIndex = source.indexOf("Domain Configuration</CardTitle>")
  assert.ok(senderIndex > -1, "Sender Identity card must exist")
  assert.ok(senderIndex < domainIndex, "Sender Identity card should appear before Domain Configuration")
})

test("API Keys card wraps its content in a form element", () => {
  // API Keys card has a form with handleSaveApiKeys
  assert.match(source, /handleSaveApiKeys/)
  assert.match(source, /Save API Keys/)
})

test("Sender Identity card wraps its content in a form element", () => {
  // Sender Identity card has a form with handleSaveSender
  assert.match(source, /handleSaveSender/)
  assert.match(source, /Save Sender Identity/)
})

test("documentation section is the Domain Configuration card", () => {
  assert.match(source, /Domain Configuration/)
  assert.match(source, /Complete these steps before sending outreach emails/)
})

test("Domain Configuration card has no form — it is read-only documentation", () => {
  // Domain card content uses <ul> not <form>
  const domainSection = source.slice(source.indexOf("Domain Configuration"))
  assert.match(domainSection, /<ul/)
  assert.doesNotMatch(domainSection, /<form/)
})

test("two form cards are in a grid layout", () => {
  assert.match(source, /grid grid-cols-1 gap-6 lg:grid-cols-2/)
})

test("Domain Configuration card is outside the two-column grid", () => {
  // Domain card has mt-6 and appears after the closing </div> of the grid
  const gridEnd = source.indexOf("</div>", source.indexOf("lg:grid-cols-2"))
  const domainCardStart = source.indexOf("Domain Configuration")
  assert.ok(domainCardStart > gridEnd, "Domain Configuration card should be after the grid div")
})
