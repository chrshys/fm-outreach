import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/dashboard/active-campaigns.tsx", "utf8")

test("exports ActiveCampaigns as a named export", () => {
  assert.match(source, /export function ActiveCampaigns/)
})

test("exports ActiveCampaignItem interface", () => {
  assert.match(source, /export interface ActiveCampaignItem/)
})

test("accepts ActiveCampaignsProps with campaigns array", () => {
  assert.match(source, /interface ActiveCampaignsProps/)
  assert.match(source, /campaigns: ActiveCampaignItem\[\]/)
})

test("ActiveCampaignItem has required fields", () => {
  assert.match(source, /_id: string/)
  assert.match(source, /name: string/)
  assert.match(source, /status: "active" \| "paused"/)
  assert.match(source, /stats: \{ sent: number; openRate: number; replyRate: number \}/)
})

test("links campaign names to /campaigns/[id]", () => {
  assert.match(source, /href=\{`\/campaigns\/\$\{campaign\._id\}`\}/)
})

test("shows stats summary with sent count and open rate", () => {
  assert.match(source, /Sent \{campaign\.stats\.sent\}/)
  assert.match(source, /Opened/)
  assert.match(source, /pct\(campaign\.stats\.openRate, 1\)/)
})

test("renders status badge with correct styles for active, paused, and draft", () => {
  assert.match(source, /bg-emerald-100 text-emerald-800/)
  assert.match(source, /bg-amber-100 text-amber-800/)
  assert.match(source, /bg-gray-100 text-gray-800/)
})

test("STATUS_STYLES maps active, paused, and draft statuses", () => {
  assert.match(source, /active:/)
  assert.match(source, /paused:/)
  assert.match(source, /draft:/)
})

test("shows empty state when no campaigns", () => {
  assert.match(source, /No active campaigns/)
})

test("card title is Active Campaigns", () => {
  assert.match(source, />Active Campaigns</)
})

test("uses Card components from shadcn/ui", () => {
  assert.match(source, /import\s*\{[\s\S]*Card[\s\S]*\}\s*from\s*"@\/components\/ui\/card"/)
})

test("uses Badge component from shadcn/ui", () => {
  assert.match(source, /import\s*\{[\s\S]*Badge[\s\S]*\}\s*from\s*"@\/components\/ui\/badge"/)
})

test("uses p-4 on CardHeader and p-4 pt-0 on CardContent per design rules", () => {
  assert.match(source, /CardHeader className="p-4"/)
  assert.match(source, /CardContent className="p-4 pt-0"/)
})

test("has a data-testid on the campaigns list container", () => {
  assert.match(source, /data-testid="active-campaigns-list"/)
})

test("campaign name link has hover underline and proper text styling", () => {
  assert.match(source, /text-sm font-medium hover:underline/)
})

test("stats summary uses muted foreground text", () => {
  assert.match(source, /text-xs text-muted-foreground/)
})

test("has local pct helper for rate formatting", () => {
  assert.match(source, /function pct\(n: number, d: number\): string/)
  assert.match(source, /if \(d === 0\) return "0%"/)
})

test("has local toLabel helper for status label formatting", () => {
  assert.match(source, /function toLabel\(value: string\): string/)
})

test("uses toLabel to format badge text", () => {
  assert.match(source, /\{toLabel\(campaign\.status\)\}/)
})

test("imports Link from next/link for campaign navigation", () => {
  assert.match(source, /import Link from "next\/link"/)
})
