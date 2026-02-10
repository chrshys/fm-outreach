import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")

test("lead detail page imports LogSocialResponse component", () => {
  assert.match(source, /import \{ LogSocialResponse \} from "@\/components\/leads\/log-social-response"/)
})

test("lead detail page renders LogSocialResponse with leadId", () => {
  assert.match(source, /<LogSocialResponse leadId=\{leadId\} \/>/)
})
