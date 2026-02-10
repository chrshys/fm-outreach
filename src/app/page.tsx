"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

import { AppLayout } from "@/components/layout/app-layout"
import { ActiveCampaigns } from "@/components/dashboard/active-campaigns"
import { EmailActivity } from "@/components/dashboard/email-activity"
import { MetricCards } from "@/components/dashboard/metric-cards"
import { PipelineFunnel } from "@/components/dashboard/pipeline-funnel"
import { SocialTouches } from "@/components/dashboard/social-touches"
import { ClustersCard } from "@/components/dashboard/clusters-card"
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
              <ActiveCampaigns campaigns={campaigns ?? []} />
            </div>

            {/* Bottom row: 3 cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="bottom-row">
              {/* Email Activity */}
              <EmailActivity
                stats={{
                  sent: emailStats?.last7Days.sent ?? 0,
                  opened: emailStats?.last7Days.opened ?? 0,
                  clicked: emailStats?.last7Days.clicked ?? 0,
                }}
              />

              {/* Social Touches */}
              <SocialTouches
                stats={{
                  dmsSent: socialStats?.last7Days.dmsSent ?? 0,
                  dmReplies: socialStats?.last7Days.dmReplies ?? 0,
                  follows: socialStats?.last7Days.follows ?? 0,
                }}
              />

              {/* Clusters */}
              <ClustersCard
                stats={{
                  clusters: clusterBreakdown?.clusters ?? [],
                  unclustered: clusterBreakdown?.unclustered ?? 0,
                }}
              />
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
