import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const page = fs.readFileSync("src/app/page.tsx", "utf8")
const metricCards = fs.readFileSync("src/components/dashboard/metric-cards.tsx", "utf8")
const pipelineFunnel = fs.readFileSync("src/components/dashboard/pipeline-funnel.tsx", "utf8")
const activeCampaigns = fs.readFileSync("src/components/dashboard/active-campaigns.tsx", "utf8")
const emailActivity = fs.readFileSync("src/components/dashboard/email-activity.tsx", "utf8")
const socialTouches = fs.readFileSync("src/components/dashboard/social-touches.tsx", "utf8")
const clustersCard = fs.readFileSync("src/components/dashboard/clusters-card.tsx", "utf8")
const needsFollowUp = fs.readFileSync("src/components/dashboard/needs-follow-up.tsx", "utf8")

test("all 7 dashboard component files exist and export named components", () => {
  assert.match(metricCards, /export function MetricCards/)
  assert.match(pipelineFunnel, /export function PipelineFunnel/)
  assert.match(activeCampaigns, /export function ActiveCampaigns/)
  assert.match(emailActivity, /export function EmailActivity/)
  assert.match(socialTouches, /export function SocialTouches/)
  assert.match(clustersCard, /export function ClustersCard/)
  assert.match(needsFollowUp, /export function NeedsFollowUp/)
})

test("page imports all 7 dashboard components", () => {
  assert.match(page, /import.*MetricCards.*from.*dashboard\/metric-cards/)
  assert.match(page, /import.*PipelineFunnel.*from.*dashboard\/pipeline-funnel/)
  assert.match(page, /import.*ActiveCampaigns.*from.*dashboard\/active-campaigns/)
  assert.match(page, /import.*EmailActivity.*from.*dashboard\/email-activity/)
  assert.match(page, /import.*SocialTouches.*from.*dashboard\/social-touches/)
  assert.match(page, /import.*ClustersCard.*from.*dashboard\/clusters-card/)
  assert.match(page, /import.*NeedsFollowUp.*from.*dashboard\/needs-follow-up/)
})

test("page renders all 7 components in JSX", () => {
  assert.match(page, /<MetricCards/)
  assert.match(page, /<PipelineFunnel/)
  assert.match(page, /<ActiveCampaigns/)
  assert.match(page, /<EmailActivity/)
  assert.match(page, /<SocialTouches/)
  assert.match(page, /<ClustersCard/)
  assert.match(page, /<NeedsFollowUp/)
})

test("dashboard has data-testid attributes for all major sections", () => {
  assert.match(page, /data-testid="dashboard"/)
  assert.match(page, /data-testid="middle-row"/)
  assert.match(page, /data-testid="bottom-row"/)
  assert.match(metricCards, /data-testid="metric-cards"/)
  assert.match(pipelineFunnel, /data-testid="pipeline-funnel"/)
  assert.match(emailActivity, /data-testid="email-activity"/)
  assert.match(socialTouches, /data-testid="social-touches"/)
  assert.match(clustersCard, /data-testid="clusters-card"/)
  assert.match(needsFollowUp, /data-testid="needs-follow-up"/)
})

test("dashboard queries all 6 Convex endpoints", () => {
  assert.match(page, /useQuery\(api\.dashboard\.pipelineStats\)/)
  assert.match(page, /useQuery\(api\.dashboard\.emailStats\)/)
  assert.match(page, /useQuery\(api\.dashboard\.socialStats\)/)
  assert.match(page, /useQuery\(api\.dashboard\.clusterBreakdown\)/)
  assert.match(page, /useQuery\(api\.dashboard\.followUpsDue\)/)
  assert.match(page, /useQuery\(api\.dashboard\.activeCampaigns\)/)
})

test("dashboard grid layout: 4-col top, 2-col middle, 3-col bottom", () => {
  // MetricCards: 4-col
  assert.match(metricCards, /lg:grid-cols-4/)
  // Middle row: 2-col
  assert.match(page, /lg:grid-cols-2/)
  // Bottom row: 3-col
  assert.match(page, /lg:grid-cols-3/)
})

test("follow-up section renders conditionally based on data", () => {
  assert.match(page, /followUps &&/)
})

test("all cards use consistent shadcn Card styling (p-4 header, p-4 pt-0 content)", () => {
  for (const [name, src] of [
    ["metric-cards", metricCards],
    ["pipeline-funnel", pipelineFunnel],
    ["active-campaigns", activeCampaigns],
    ["email-activity", emailActivity],
    ["social-touches", socialTouches],
    ["clusters-card", clustersCard],
    ["needs-follow-up", needsFollowUp],
  ]) {
    assert.match(src, /CardHeader className="p-4"/, `${name} should use p-4 on CardHeader`)
    assert.match(src, /CardContent className="p-4 pt-0"/, `${name} should use p-4 pt-0 on CardContent`)
  }
})
