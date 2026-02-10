"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

import { AppLayout } from "@/components/layout/app-layout"
import { MetricCards } from "@/components/dashboard/metric-cards"
import { PipelineFunnel } from "@/components/dashboard/pipeline-funnel"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type PipelineStats = Record<string, number>

type EmailStatsResult = {
  last7Days: { sent: number; opened: number; clicked: number; replied: number }
  last30Days: { sent: number; opened: number; clicked: number; replied: number }
}

type SocialStatsResult = {
  last7Days: { dmsSent: number; dmReplies: number; follows: number }
  last30Days: { dmsSent: number; dmReplies: number; follows: number }
}

type ClusterBreakdownResult = {
  clusters: { name: string; count: number }[]
  unclustered: number
}

type FollowUpItem = {
  _id: string
  name: string
  city: string
  type: string
  nextFollowUpAt: number
}

type FollowUpsDueResult = {
  dueToday: FollowUpItem[]
  overdue: FollowUpItem[]
}

type ActiveCampaignResult = {
  _id: string
  name: string
  status: "active" | "paused"
  leadCount: number
  stats: { sent: number; openRate: number; replyRate: number }
}

const campaignStatusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
}

function pct(n: number, d: number): string {
  if (d === 0) return "0%"
  return `${Math.round((n / d) * 100)}%`
}

function daysOverdue(nextFollowUpAt: number, now: number): number {
  const MS_PER_DAY = 86_400_000
  return Math.floor((now - nextFollowUpAt) / MS_PER_DAY)
}

function toLabel(value: string): string {
  return value
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

export default function HomePage() {
  // @ts-expect-error Convex FilterApi deep type instantiation with dashboard module
  const pipeline = useQuery(api.dashboard.pipelineStats) as PipelineStats | undefined
  const emailStats = useQuery(api.dashboard.emailStats) as EmailStatsResult | undefined
  const socialStats = useQuery(api.dashboard.socialStats) as SocialStatsResult | undefined
  const clusterBreakdown = useQuery(api.dashboard.clusterBreakdown) as ClusterBreakdownResult | undefined
  const followUps = useQuery(api.dashboard.followUpsDue) as FollowUpsDueResult | undefined
  const campaigns = useQuery(api.dashboard.activeCampaigns) as ActiveCampaignResult[] | undefined

  const totalLeads = pipeline
    ? Object.values(pipeline).reduce((sum, n) => sum + n, 0)
    : 0
  const onboarded = pipeline?.onboarded ?? 0
  const replies30d = emailStats?.last30Days.replied ?? 0
  const sent30d = emailStats?.last30Days.sent ?? 0
  const followUpCount = followUps
    ? followUps.dueToday.length + followUps.overdue.length
    : 0
  const overdueCount = followUps?.overdue.length ?? 0

  const topClusters = clusterBreakdown
    ? [...clusterBreakdown.clusters].sort((a, b) => b.count - a.count).slice(0, 3)
    : []

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [followUps])
  const isLoading = pipeline === undefined

  return (
    <AppLayout>
      <section className="space-y-6" data-testid="dashboard">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Top row: 4 metric cards */}
            <MetricCards
              onboarded={onboarded}
              totalLeads={totalLeads}
              replies30d={replies30d}
              sent30d={sent30d}
              followUpCount={followUpCount}
              overdueCount={overdueCount}
            />

            {/* Middle row: 2 wider cards */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="middle-row">
              {/* Pipeline Funnel */}
              <PipelineFunnel pipeline={pipeline} />

              {/* Active Campaigns */}
              <Card>
                <CardHeader className="p-4">
                  <CardTitle>Active Campaigns</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {campaigns && campaigns.length > 0 ? (
                    <div className="space-y-3">
                      {campaigns.map((campaign) => (
                        <div key={campaign._id} className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/campaigns/${campaign._id}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {campaign.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              Sent {campaign.stats.sent} &mdash; Opened{" "}
                              {pct(campaign.stats.openRate, 1)}
                            </p>
                          </div>
                          <Badge className={campaignStatusStyles[campaign.status]}>
                            {toLabel(campaign.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active campaigns</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bottom row: 3 cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="bottom-row">
              {/* Email Activity */}
              <Card>
                <CardHeader className="p-4">
                  <CardTitle>Email Activity (7d)</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sent</span>
                      <span className="font-medium">{emailStats?.last7Days.sent ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Opened</span>
                      <span className="font-medium">{emailStats?.last7Days.opened ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Clicked</span>
                      <span className="font-medium">{emailStats?.last7Days.clicked ?? 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Touches */}
              <Card>
                <CardHeader className="p-4">
                  <CardTitle>Social Touches (7d)</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">DMs Sent</span>
                      <span className="font-medium">{socialStats?.last7Days.dmsSent ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Replies</span>
                      <span className="font-medium">{socialStats?.last7Days.dmReplies ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Follows</span>
                      <span className="font-medium">{socialStats?.last7Days.follows ?? 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Clusters */}
              <Card>
                <CardHeader className="p-4">
                  <CardTitle>Clusters</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {topClusters.length > 0 ? (
                    <div className="space-y-2">
                      {topClusters.map((cluster) => (
                        <div key={cluster.name} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{cluster.name}</span>
                          <span className="font-medium">{cluster.count}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm border-t pt-2">
                        <span className="text-muted-foreground">Unclustered</span>
                        <span className="font-medium">{clusterBreakdown?.unclustered ?? 0}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No clusters yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Follow-up Section */}
            {followUps && (followUps.dueToday.length > 0 || followUps.overdue.length > 0) && (
              <Card data-testid="follow-ups-section">
                <CardHeader className="p-4">
                  <CardTitle>Needs Follow-up</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                    {[...followUps.overdue, ...followUps.dueToday].map((lead) => {
                      const days = daysOverdue(lead.nextFollowUpAt, now)
                      const overdueText =
                        days > 0
                          ? `${days} day${days === 1 ? "" : "s"} overdue`
                          : "Due today"
                      return (
                        <div key={lead._id} className="flex items-center justify-between text-sm">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/leads/${lead._id}`}
                              className="font-medium hover:underline"
                            >
                              {lead.name}
                            </Link>
                            <span className="ml-2 text-muted-foreground">
                              {lead.city} &middot; {toLabel(lead.type)}
                            </span>
                          </div>
                          <span className={days > 0 ? "text-red-600 shrink-0" : "text-muted-foreground shrink-0"}>
                            {overdueText}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/leads?needsFollowUp=true"
                      className="text-sm text-primary hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>
    </AppLayout>
  )
}
