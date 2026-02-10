import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/page.tsx", "utf8")

test("wraps the dashboard page content with AppLayout", () => {
  assert.match(source, /import\s+\{\s*AppLayout\s*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout>[\s\S]*<\/AppLayout>/)
})

test("is a client component", () => {
  assert.match(source, /^"use client"/)
})

test("queries all six dashboard endpoints", () => {
  assert.match(source, /useQuery\(api\.dashboard\.pipelineStats\)/)
  assert.match(source, /useQuery\(api\.dashboard\.emailStats\)/)
  assert.match(source, /useQuery\(api\.dashboard\.socialStats\)/)
  assert.match(source, /useQuery\(api\.dashboard\.clusterBreakdown\)/)
  assert.match(source, /useQuery\(api\.dashboard\.followUpsDue\)/)
  assert.match(source, /useQuery\(api\.dashboard\.activeCampaigns\)/)
})

test("imports and renders MetricCards component", () => {
  assert.match(source, /import\s+\{\s*MetricCards\s*\}\s+from\s+"@\/components\/dashboard\/metric-cards"/)
  assert.match(source, /<MetricCards/)
})

test("passes all required props to MetricCards", () => {
  assert.match(source, /onboarded=\{onboarded\}/)
  assert.match(source, /totalLeads=\{totalLeads\}/)
  assert.match(source, /replies30d=\{replies30d\}/)
  assert.match(source, /sent30d=\{sent30d\}/)
  assert.match(source, /followUpCount=\{followUpCount\}/)
  assert.match(source, /overdueCount=\{overdueCount\}/)
})

test("renders middle row with 2 wider cards in a 2-column grid", () => {
  assert.match(source, /data-testid="middle-row"/)
  assert.match(source, /lg:grid-cols-2/)
})

test("imports and renders PipelineFunnel component", () => {
  assert.match(source, /import\s+\{\s*PipelineFunnel\s*\}\s+from\s+"@\/components\/dashboard\/pipeline-funnel"/)
  assert.match(source, /<PipelineFunnel pipeline=\{pipeline\}/)
})

test("imports and renders ActiveCampaigns component", () => {
  assert.match(source, /import\s+\{\s*ActiveCampaigns\s*\}\s+from\s+"@\/components\/dashboard\/active-campaigns"/)
  assert.match(source, /<ActiveCampaigns campaigns=\{campaigns \?\? \[\]\}/)
})

test("renders bottom row with 3 cards in a 3-column grid", () => {
  assert.match(source, /data-testid="bottom-row"/)
  assert.match(source, /lg:grid-cols-3/)
})

test("email activity card shows sent, opened, clicked for last 7 days", () => {
  assert.match(source, /import\s+\{\s*EmailActivity\s*\}\s+from\s+"@\/components\/dashboard\/email-activity"/)
  assert.match(source, /<EmailActivity/)
  assert.match(source, /emailStats\?\.last7Days\.sent/)
  assert.match(source, /emailStats\?\.last7Days\.opened/)
  assert.match(source, /emailStats\?\.last7Days\.clicked/)
})

test("social touches card shows DMs, replies, follows for last 7 days", () => {
  assert.match(source, /import\s+\{\s*SocialTouches\s*\}\s+from\s+"@\/components\/dashboard\/social-touches"/)
  assert.match(source, /<SocialTouches/)
  assert.match(source, /socialStats\?\.last7Days\.dmsSent/)
  assert.match(source, /socialStats\?\.last7Days\.dmReplies/)
  assert.match(source, /socialStats\?\.last7Days\.follows/)
})

test("clusters card uses ClustersCard component with cluster breakdown data", () => {
  assert.match(source, /import\s+\{\s*ClustersCard\s*\}\s+from\s+"@\/components\/dashboard\/clusters-card"/)
  assert.match(source, /<ClustersCard/)
  assert.match(source, /clusterBreakdown\?\.clusters/)
  assert.match(source, /clusterBreakdown\?\.unclustered/)
})

test("follow-up section lists leads with links to /leads/[id]", () => {
  assert.match(source, /data-testid="follow-ups-section"/)
  assert.match(source, /Needs Follow-up/)
  assert.match(source, /href=\{`\/leads\/\$\{lead\._id\}`\}/)
})

test("follow-up section shows overdue text in red and due-today items", () => {
  assert.match(source, /overdue/)
  assert.match(source, /Due today/)
  assert.match(source, /text-red-600/)
})

test("follow-up section has View all link", () => {
  assert.match(source, /View all/)
  assert.match(source, /\/leads\?needsFollowUp=true/)
})

test("shows loading state while data is undefined", () => {
  assert.match(source, /Loading dashboard\.\.\./)
})
