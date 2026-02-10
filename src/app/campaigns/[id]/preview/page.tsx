"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useAction, useMutation, useQuery } from "convex/react"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  Edit2,
  Loader2,
  Mail,
  RefreshCw,
  Rocket,
  Save,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { AppLayout } from "@/components/layout/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type PageParams = {
  params: Promise<{ id: string }>
}

type GeneratedEmailItem = {
  _id: Id<"generatedEmails">
  campaignId: Id<"campaigns">
  leadId: Id<"leads">
  templateId: Id<"emailTemplates">
  subject: string
  body: string
  status: "generated" | "edited" | "approved" | "rejected"
  generatedAt: number
  leadName: string
  leadEmail?: string
}

const statusConfig: Record<
  GeneratedEmailItem["status"],
  { label: string; className: string }
> = {
  generated: { label: "Generated", className: "bg-blue-100 text-blue-800" },
  edited: { label: "Edited", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
}

function countWords(text: string): number {
  const footerIndex = text.indexOf("\n---\n")
  const content = footerIndex !== -1 ? text.slice(0, footerIndex) : text
  return content.trim().split(/\s+/).filter(Boolean).length
}

function extractPersonalizationVars(body: string, subject: string): string[] {
  const vars: string[] = []
  const combined = `${subject} ${body}`

  if (/\b(Hi|Hey|Dear)\s+[A-Z][a-z]+/.test(combined)) vars.push("contactName")
  if (combined.includes("\n---\n")) vars.push("caslFooter")

  return vars
}

function EmailDetail({
  email,
}: {
  email: GeneratedEmailItem
}) {
  const updateEmail = useMutation(api.generatedEmails.updateEmail)
  const updateStatus = useMutation(api.generatedEmails.updateStatus)
  const regenerateEmail = useMutation(api.generatedEmails.regenerate)
  const generateEmailAction = useAction(api.email.generateEmail.generateEmail)

  const [isEditing, setIsEditing] = useState(false)
  const [editSubject, setEditSubject] = useState(email.subject)
  const [editBody, setEditBody] = useState(email.body)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const wordCount = countWords(email.body)
  const personalizationVars = extractPersonalizationVars(email.body, email.subject)

  function handleStartEdit() {
    setEditSubject(email.subject)
    setEditBody(email.body)
    setIsEditing(true)
  }

  async function handleSaveEdit() {
    try {
      await updateEmail({
        emailId: email._id,
        subject: editSubject,
        body: editBody,
      })
      setIsEditing(false)
      toast.success("Email updated")
    } catch {
      toast.error("Failed to save changes")
    }
  }

  function handleCancelEdit() {
    setIsEditing(false)
    setEditSubject(email.subject)
    setEditBody(email.body)
  }

  async function handleRegenerate() {
    setIsRegenerating(true)
    try {
      const result = await generateEmailAction({
        leadId: email.leadId,
        templateId: email.templateId,
      })
      await regenerateEmail({
        emailId: email._id,
        subject: result.subject,
        body: result.body,
      })
      toast.success("Email regenerated")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Regeneration failed"
      toast.error(message)
    } finally {
      setIsRegenerating(false)
    }
  }

  async function handleApprove() {
    try {
      await updateStatus({ emailId: email._id, status: "approved" })
      toast.success("Email approved")
    } catch {
      toast.error("Failed to approve")
    }
  }

  async function handleReject() {
    try {
      await updateStatus({ emailId: email._id, status: "rejected" })
      toast.success("Email rejected")
    } catch {
      toast.error("Failed to reject")
    }
  }

  const statusInfo = statusConfig[email.status]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{email.leadName}</h3>
          {email.leadEmail ? (
            <p className="text-sm text-muted-foreground">{email.leadEmail}</p>
          ) : null}
        </div>
        <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isRegenerating || isEditing}
          onClick={() => void handleRegenerate()}
        >
          {isRegenerating ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 size-3.5" />
          )}
          Regenerate
        </Button>
        {isEditing ? (
          <>
            <Button size="sm" onClick={() => void handleSaveEdit()}>
              <Save className="mr-1.5 size-3.5" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancelEdit}>
              <X className="mr-1.5 size-3.5" />
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={handleStartEdit}>
            <Edit2 className="mr-1.5 size-3.5" />
            Edit
          </Button>
        )}
        {email.status !== "approved" && !isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleApprove()}
          >
            <Check className="mr-1.5 size-3.5" />
            Approve
          </Button>
        ) : null}
        {email.status !== "rejected" && !isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleReject()}
          >
            <XCircle className="mr-1.5 size-3.5" />
            Reject
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Subject
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {isEditing ? (
            <div className="space-y-1">
              <Label htmlFor="edit-subject" className="sr-only">
                Subject
              </Label>
              <Input
                id="edit-subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
              />
            </div>
          ) : (
            <p className="text-sm">{email.subject}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Body
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {isEditing ? countWords(editBody) : wordCount} words
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {isEditing ? (
            <div className="space-y-1">
              <Label htmlFor="edit-body" className="sr-only">
                Body
              </Label>
              <Textarea
                id="edit-body"
                value={editBody}
                className="min-h-48"
                onChange={(e) => setEditBody(e.target.value)}
              />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm font-sans">
              {email.body}
            </pre>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Generated {new Date(email.generatedAt).toLocaleString()}</span>
        {personalizationVars.length > 0 ? (
          <span>
            Variables: {personalizationVars.join(", ")}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default function CampaignPreviewPage({ params }: PageParams) {
  const { id } = use(params)
  const campaignId = id as Id<"campaigns">

  const campaign = useQuery(api.campaigns.get, { campaignId })
  const emails = useQuery(api.generatedEmails.listByCampaign, {
    campaignId,
  }) as GeneratedEmailItem[] | undefined

  const bulkUpdate = useMutation(api.generatedEmails.bulkUpdateStatus)
  const pushToSmartlead = useAction(
    api.campaigns.pushToSmartlead.pushToSmartlead,
  )

  const [selectedEmailId, setSelectedEmailId] = useState<
    Id<"generatedEmails"> | null
  >(null)
  const [showPushDialog, setShowPushDialog] = useState(false)
  const [isPushing, setIsPushing] = useState(false)

  const selectedEmail =
    emails?.find((e) => e._id === selectedEmailId) ?? emails?.[0] ?? null

  async function handleApproveAll() {
    try {
      const result = await bulkUpdate({
        campaignId,
        status: "approved",
        excludeRejected: true,
      })
      toast.success(`${result.updated} email${result.updated === 1 ? "" : "s"} approved`)
    } catch {
      toast.error("Failed to approve emails")
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

  if (campaign === undefined || emails === undefined) {
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
  const pendingCount = emails.length - approvedCount - rejectedCount
  const allApproved =
    emails.length > 0 && approvedCount + rejectedCount === emails.length && approvedCount > 0
  const canPush = campaign.status === "draft" && !campaign.smartleadCampaignId && allApproved

  return (
    <AppLayout title="Campaigns">
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/campaigns"
            className="hover:text-foreground transition-colors"
          >
            Campaigns
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{campaign.name}</span>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Preview</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">
              Email Preview
            </h2>
            <p className="text-muted-foreground text-sm">
              {emails.length} emails &middot; {approvedCount} approved
              {rejectedCount > 0 ? ` · ${rejectedCount} rejected` : ""}
              {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {emails.length > 0 && pendingCount > 0 ? (
              <Button
                size="sm"
                onClick={() => void handleApproveAll()}
              >
                <CheckCheck className="mr-1.5 size-4" />
                Approve All
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
            <Button variant="outline" asChild>
              <Link href="/campaigns">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        {emails.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-2 py-8">
                <Mail className="size-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  No emails generated yet. Run batch generation first.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
            {/* Lead list sidebar */}
            <Card className="lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto">
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Leads</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="space-y-0.5">
                  {emails.map((email) => {
                    const isSelected =
                      email._id === (selectedEmailId ?? emails[0]?._id)
                    const statusInfo = statusConfig[email.status]

                    return (
                      <button
                        key={email._id}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-muted font-medium"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedEmailId(email._id)}
                      >
                        <div className="min-w-0">
                          <p className="truncate">{email.leadName}</p>
                          {email.leadEmail ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {email.leadEmail}
                            </p>
                          ) : null}
                        </div>
                        <Badge
                          className={`ml-2 shrink-0 text-[10px] ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Email detail panel */}
            <Card>
              <CardContent className="p-4">
                {selectedEmail ? (
                  <EmailDetail
                    key={selectedEmail._id}
                    email={selectedEmail}
                  />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Select a lead to preview their email.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

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
      </section>
    </AppLayout>
  )
}
