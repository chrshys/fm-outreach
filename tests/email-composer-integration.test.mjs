import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")

test("lead detail page imports EmailComposer", () => {
  assert.match(source, /import\s*\{\s*EmailComposer\s*\}\s*from\s*"@\/components\/leads\/email-composer"/)
})

test("lead detail page renders EmailComposer with leadId and leadName", () => {
  assert.match(source, /<EmailComposer\s+leadId=\{leadId\}\s+leadName=\{lead\.name\}\s*\/>/)
})

test("EmailComposer is placed alongside LogActivity in the activity card", () => {
  const logActivityIdx = source.indexOf("<LogActivity leadId={leadId}")
  const emailComposerIdx = source.indexOf("<EmailComposer leadId={leadId}")
  assert.ok(logActivityIdx > 0, "LogActivity should exist")
  assert.ok(emailComposerIdx > 0, "EmailComposer should exist")
  assert.ok(emailComposerIdx > logActivityIdx, "EmailComposer should come after LogActivity")
})
