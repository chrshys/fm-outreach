"use client"

import { use } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Loader2,
  Mail,
  MousePointerClick,
  Reply,
  Send,
  TriangleAlert,
  Users,
} from "lucide-react"

import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import { AppLayout } from "@/components/layout/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type PageParams = {
  params: Promise<{ id: string }>
}

const campaignStatusStyles: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  pushed: "bg-violet-100 text-violet-800",
  active: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-800",
}

const leadStatusStyles: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700",
  sent: "bg-blue-100 text-blue-800",
  opened: "bg-indigo-100 text-indigo-800",
  replied: "bg-emerald-100 text-emerald-800",
  bounced: "bg-red-100 text-red-800",
}

function toLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "0%"
  return `${Math.round((numerator / denominator) * 100)}%`
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp))
}

export default function CampaignDetailPage({ params }: PageParams) {
  const { id } = use(params)
  const campaignId = id as Id<"campaigns">

  const campaign = useQuery(api.campaigns.get, { campaignId })
  const leads = useQuery(api.campaigns.listLeads, { campaignId })

  if (campaign === undefined || leads === undefined) {
    return (
      <AppLayout title="Campaigns">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (campaign === null) {
    return (
      <AppLayout title="Campaigns">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">Campaign not found.</p>
        </div>
      </AppLayout>
    )
  }

  const stats = campaign.stats
  const sent = stats?.sent ?? 0
  const openRate = pct(stats?.opened ?? 0, sent)
  const clickRate = pct(stats?.clicked ?? 0, sent)
  const replyRate = pct(stats?.replied ?? 0, sent)
  const bounceRate = pct(stats?.bounced ?? 0, sent)

  return (
    <AppLayout title="Campaigns">
      <section className="space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/campaigns"
            className="hover:text-foreground transition-colors"
          >
            Campaigns
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{campaign.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight">
                {campaign.name}
              </h2>
              <Badge className={campaignStatusStyles[campaign.status]}>
                {toLabel(campaign.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                Created {formatDate(campaign.createdAt)}
              </span>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/campaigns">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-1 text-sm">
                <Users className="size-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">{campaign.leadCount}</span>
                <span className="text-xs text-muted-foreground">Total Leads</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-1 text-sm">
                <Send className="size-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">{sent}</span>
                <span className="text-xs text-muted-foreground">Emails Sent</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-1 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">{openRate}</span>
                <span className="text-xs text-muted-foreground">Open Rate</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-1 text-sm">
                <MousePointerClick className="size-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">{clickRate}</span>
                <span className="text-xs text-muted-foreground">Click Rate</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-1 text-sm">
                <Reply className="size-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">{replyRate}</span>
                <span className="text-xs text-muted-foreground">Reply Rate</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-1 text-sm">
                <TriangleAlert className="size-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">{bounceRate}</span>
                <span className="text-xs text-muted-foreground">Bounce Rate</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Leads</h3>
          {leads.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm py-8 text-center">
                  No leads assigned to this campaign yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Sequence Step</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow
                        key={lead._id}
                        className={cn(
                          lead.status === "replied" && "bg-emerald-50 dark:bg-emerald-950/20"
                        )}
                      >
                        <TableCell>
                          <Link
                            href={`/leads/${lead._id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {lead.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {lead.contactEmail ?? "—"}
                        </TableCell>
                        <TableCell>{lead.sequenceStep}</TableCell>
                        <TableCell>
                          <Badge className={leadStatusStyles[lead.status]}>
                            {toLabel(lead.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>
                              {lead.lastActivityAt
                                ? formatDate(lead.lastActivityAt)
                                : "—"}
                            </span>
                            {lead.repliedAt ? (
                              <Link
                                href={`/leads/${lead._id}#activity`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                              >
                                <Reply className="size-3" />
                                View Reply
                              </Link>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </AppLayout>
  )
}
