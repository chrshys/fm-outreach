import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const componentSource = fs.readFileSync(
  "src/components/dashboard/active-campaigns.tsx",
  "utf8",
)

// ── Campaign name links to detail page ──────────────────────────────────

test("campaign name is wrapped in a Next.js Link component", () => {
  assert.match(componentSource, /import Link from "next\/link"/)
})

test("Link href points to /campaigns/{campaign._id}", () => {
  assert.match(componentSource, /href=\{`\/campaigns\/\$\{campaign\._id\}`\}/)
})

test("campaign name text is rendered inside the Link", () => {
  // The Link wraps {campaign.name}
  assert.match(componentSource, /<Link[\s\S]*?\{campaign\.name\}[\s\S]*?<\/Link>/)
})

test("campaign name link has hover:underline for click affordance", () => {
  assert.match(componentSource, /hover:underline/)
})

// ── Campaign detail route exists ────────────────────────────────────────

test("campaign detail page exists at /campaigns/[id]", () => {
  assert.ok(
    fs.existsSync("src/app/campaigns/[id]/page.tsx"),
    "src/app/campaigns/[id]/page.tsx should exist",
  )
})

test("campaign detail page accepts id param and queries campaign data", () => {
  const detailSource = fs.readFileSync("src/app/campaigns/[id]/page.tsx", "utf8")
  assert.match(detailSource, /params:.*Promise<\{ id: string \}>/)
  assert.match(detailSource, /api\.campaigns\.get/)
})

test("campaign detail page renders campaign name", () => {
  const detailSource = fs.readFileSync("src/app/campaigns/[id]/page.tsx", "utf8")
  assert.match(detailSource, /\{campaign\.name\}/)
})
