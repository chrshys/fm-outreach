"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { Mail, MessageSquare, Plus, Send, Users } from "lucide-react"
import { api } from "../../../convex/_generated/api"

import { AppLayout } from "@/components/layout/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type CampaignStats = {
  sent: number
  opened: number
  clicked: number
  replied: number
  bounced: number
}

type Campaign = {
  _id: string
  name: string
  status: "draft" | "pushed" | "active" | "paused" | "completed"
  leadCount: number
  stats?: CampaignStats
  smartleadCampaignId?: string
}

const statusStyles: Record<Campaign["status"], string> = {
  draft: "bg-zinc-100 text-zinc-700",
  pushed: "bg-violet-100 text-violet-800",
  active: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-800",
}

function toLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "0%"
  return `${Math.round((numerator / denominator) * 100)}%`
}

export default function CampaignsPage() {
  const campaigns = useQuery(api.campaigns.list) as Campaign[] | undefined

  return (
    <AppLayout>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Campaigns</h2>
            <p className="text-muted-foreground text-sm">
              Manage outreach campaigns and track performance.
            </p>
          </div>
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="size-4" />
              Create Campaign
            </Link>
          </Button>
        </div>

        {campaigns === undefined ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-sm py-8 text-center">
                No campaigns yet. Create your first campaign to start outreach.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const stats = campaign.stats
              const sent = stats?.sent ?? 0
              const openedPct = pct(stats?.opened ?? 0, sent)
              const repliedPct = pct(stats?.replied ?? 0, sent)

              return (
                <Link key={campaign._id} href={`/campaigns/${campaign._id}`}>
                <Card className="transition-colors hover:border-primary/30">
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between">
                      <CardTitle>{campaign.name}</CardTitle>
                      <Badge className={statusStyles[campaign.status]}>
                        {toLabel(campaign.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                      <Users className="size-3.5" />
                      <span>{campaign.leadCount} leads</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 px-2 py-2">
                        <Send className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">{sent}</span>
                        <span className="text-xs text-muted-foreground">Sent</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 px-2 py-2">
                        <Mail className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">{openedPct}</span>
                        <span className="text-xs text-muted-foreground">Opened</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 px-2 py-2">
                        <MessageSquare className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">{repliedPct}</span>
                        <span className="text-xs text-muted-foreground">Replied</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </AppLayout>
  )
}
