import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const leadDetailSource = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")

test("lead detail page imports SocialDmComposer", () => {
  assert.match(leadDetailSource, /import\s*\{\s*SocialDmComposer\s*\}\s*from\s*"@\/components\/leads\/social-dm-composer"/)
})

test("lead detail page renders SocialDmComposer with leadId and leadName", () => {
  assert.match(leadDetailSource, /<SocialDmComposer\s+leadId=\{leadId\}\s+leadName=\{lead\.name\}\s*\/>/)
})

test("SocialDmComposer is placed next to EmailComposer in the activity section", () => {
  const emailIdx = leadDetailSource.indexOf("<EmailComposer")
  const socialIdx = leadDetailSource.indexOf("<SocialDmComposer")
  assert.ok(emailIdx > 0, "EmailComposer should exist in lead detail page")
  assert.ok(socialIdx > 0, "SocialDmComposer should exist in lead detail page")
  assert.ok(socialIdx > emailIdx, "SocialDmComposer should appear after EmailComposer")
})
