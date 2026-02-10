import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/settings/page.tsx", "utf8")

test("renders Domain Configuration card with title", () => {
  assert.match(source, /Domain Configuration/)
})

test("renders Domain Configuration card description", () => {
  assert.match(source, /Complete these steps before sending outreach emails/)
})

test("domain checklist includes SPF record configured", () => {
  assert.match(source, /SPF record configured/)
})

test("domain checklist includes DKIM configured", () => {
  assert.match(source, /DKIM configured/)
})

test("domain checklist includes DMARC configured", () => {
  assert.match(source, /DMARC configured/)
})

test("domain checklist includes warmup period complete", () => {
  assert.match(source, /Warmup period complete/)
})

test("domain checklist has four items", () => {
  assert.match(source, /DOMAIN_CHECKLIST/)
  const items = source.match(/id: "/g)
  assert.equal(items.length, 4)
})

test("domain checklist items have descriptions", () => {
  assert.match(source, /Add a TXT record to authorize your sending server/)
  assert.match(source, /Publish your DKIM public key as a DNS TXT record/)
  assert.match(source, /Add a DMARC policy to instruct receivers on failed checks/)
  assert.match(source, /Gradually increase sending volume/)
})

test("domain card uses Circle icon for checklist items", () => {
  assert.match(source, /<Circle/)
})

test("domain card is read-only with no form or button", () => {
  // The domain card section should use <ul> not <form>
  // Count forms - should be exactly 2 (API keys and Sender Identity)
  const formTags = source.match(/<form /g)
  assert.equal(formTags.length, 2)
})

test("domain card renders as a list", () => {
  assert.match(source, /<ul/)
  assert.match(source, /<li/)
})
