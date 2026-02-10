"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useAction, useQuery } from "convex/react"
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Loader2,
  Mail,
  MousePointerClick,
  Play,
  Reply,
  Rocket,
  Send,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react"
import { toast } from "sonner"

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

  const campaign = useQuery(
    api.campaigns.get,
    { campaignId },
  )
  const leads = useQuery(api.campaigns.listLeads, { campaignId })
  const emails = useQuery(api.generatedEmails.listByCampaign, { campaignId })
  const batchGenerateAction = useAction(api.email.batchGenerate.batchGenerate)
  const pushToSmartlead = useAction(
    api.campaigns.pushToSmartlead.pushToSmartlead,
  )
  const launchCampaignAction = useAction(
    api.campaigns.launchCampaign.launchCampaign,
  )

  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPushDialog, setShowPushDialog] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [showLaunchDialog, setShowLaunchDialog] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)

  async function handleGenerateEmails() {
    setIsGenerating(true)
    try {
      const result = await batchGenerateAction({ campaignId })
      setShowGenerateDialog(false)
      toast.success(
        `Generated ${result.succeeded} email${result.succeeded === 1 ? "" : "s"}${result.skipped > 0 ? ` (${result.skipped} skipped)` : ""}${result.failed > 0 ? ` — ${result.failed} failed` : ""}`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed"
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handlePushToSmartlead() {
    setIsPushing(true)
    try {
      const result = await pushToSmartlead({ campaignId })
      setShowPushDialog(false)
      toast.success(
        `Campaign pushed to Smartlead — ${result.sequenceSteps} sequence step${result.sequenceSteps === 1 ? "" : "s"}, ${result.leadsAdded} lead${result.leadsAdded === 1 ? "" : "s"} added`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Push failed"
      toast.error(message)
    } finally {
      setIsPushing(false)
    }
  }

  async function handleLaunchCampaign() {
    setIsLaunching(true)
    try {
      await launchCampaignAction({ campaignId })
      setShowLaunchDialog(false)
      toast.success("Campaign launched — emails will start sending shortly")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Launch failed"
      toast.error(message)
    } finally {
      setIsLaunching(false)
    }
  }

  if (campaign === undefined || leads === undefined || emails === undefined) {
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

  const approvedCount = emails.filter((e) => e.status === "approved").length
  const rejectedCount = emails.filter((e) => e.status === "rejected").length
  const allApproved =
    emails.length > 0 && approvedCount + rejectedCount === emails.length && approvedCount > 0
  const canPush = campaign.status === "draft" && !campaign.smartleadCampaignId && allApproved

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
          <div className="flex items-center gap-2">
            {campaign.status === "draft" && emails.length === 0 ? (
              <Button
                size="sm"
                onClick={() => setShowGenerateDialog(true)}
              >
                <Sparkles className="mr-1.5 size-4" />
                Generate Emails
              </Button>
            ) : null}
            {campaign.status === "draft" && !campaign.smartleadCampaignId ? (
              <Button
                size="sm"
                disabled={!canPush}
                onClick={() => setShowPushDialog(true)}
              >
                <Rocket className="mr-1.5 size-4" />
                Push to Smartlead
              </Button>
            ) : null}
            {campaign.status === "pushed" ? (
              <Button
                size="sm"
                onClick={() => setShowLaunchDialog(true)}
              >
                <Play className="mr-1.5 size-4" />
                Launch Campaign
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/campaigns">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
          </div>
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
        <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Push to Smartlead</DialogTitle>
              <DialogDescription>
                This will create the campaign in Smartlead and add{" "}
                {approvedCount} lead{approvedCount === 1 ? "" : "s"}. You&apos;ll
                need to launch it from Smartlead or click Launch below.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPushDialog(false)}
                disabled={isPushing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handlePushToSmartlead()}
                disabled={isPushing}
              >
                {isPushing ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Rocket className="mr-1.5 size-4" />
                )}
                {isPushing ? "Pushing…" : "Confirm Push"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Launch Campaign</DialogTitle>
              <DialogDescription>
                This will start sending emails to all {campaign.leadCount} lead
                {campaign.leadCount === 1 ? "" : "s"} in this campaign. Are you
                sure you want to launch?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowLaunchDialog(false)}
                disabled={isLaunching}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleLaunchCampaign()}
                disabled={isLaunching}
              >
                {isLaunching ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Play className="mr-1.5 size-4" />
                )}
                {isLaunching ? "Launching…" : "Confirm Launch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Emails</DialogTitle>
              <DialogDescription>
                This will use AI to generate personalized emails for all{" "}
                {campaign.leadCount} lead{campaign.leadCount === 1 ? "" : "s"} in
                this campaign. You can review and edit them before sending.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowGenerateDialog(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleGenerateEmails()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 size-4" />
                )}
                {isGenerating ? "Generating…" : "Confirm Generate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </AppLayout>
  )
}
