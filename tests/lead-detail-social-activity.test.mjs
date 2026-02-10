import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")

test("lead detail page imports LogSocialActivity component", () => {
  assert.match(source, /import \{ LogSocialActivity \} from "@\/components\/leads\/log-social-activity"/)
})

test("lead detail page renders LogSocialActivity in activity card", () => {
  assert.match(source, /<LogSocialActivity leadId=\{leadId\} \/>/)
})
