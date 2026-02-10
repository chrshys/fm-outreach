import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const componentSource = fs.readFileSync(
  "src/components/dashboard/needs-follow-up.tsx",
  "utf8",
)

// ── Follow-up lead name links to lead detail page ──────────────────────

test("follow-up component imports Link from next/link", () => {
  assert.match(componentSource, /import Link from "next\/link"/)
})

test("Link href points to /leads/{lead._id}", () => {
  assert.match(componentSource, /href=\{`\/leads\/\$\{lead\._id\}`\}/)
})

test("lead name text is rendered inside the Link", () => {
  assert.match(componentSource, /<Link[\s\S]*?\{lead\.name\}[\s\S]*?<\/Link>/)
})

test("lead name link has hover:underline for click affordance", () => {
  assert.match(componentSource, /hover:underline/)
})

// ── Lead detail route exists ───────────────────────────────────────────

test("lead detail page exists at /leads/[id]", () => {
  assert.ok(
    fs.existsSync("src/app/leads/[id]/page.tsx"),
    "src/app/leads/[id]/page.tsx should exist",
  )
})

test("lead detail page accepts id param and queries lead data", () => {
  const detailSource = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")
  assert.match(detailSource, /useParams/)
  assert.match(detailSource, /api\.leads\.get/)
})

test("lead detail page renders lead name", () => {
  const detailSource = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")
  assert.match(detailSource, /\{lead\.name\}/)
})
