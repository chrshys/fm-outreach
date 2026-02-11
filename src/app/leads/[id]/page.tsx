"use client"

import { Facebook, Instagram } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import type { KeyboardEvent } from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { api } from "../../../../convex/_generated/api"
import type { Doc, Id } from "../../../../convex/_generated/dataModel"
import { AppLayout } from "@/components/layout/app-layout"
import { ActivityTimeline } from "@/components/leads/activity-timeline"
import { DataFreshness } from "@/components/leads/data-freshness"
import { EmailComposer } from "@/components/leads/email-composer"
import { SocialDmComposer } from "@/components/leads/social-dm-composer"
import { FollowUpReminder } from "@/components/leads/follow-up-reminder"
import { LogActivity } from "@/components/leads/log-activity"
import { LogSocialActivity } from "@/components/leads/log-social-activity"
import { LogSocialResponse } from "@/components/leads/log-social-response"
import { StatusSelector } from "@/components/leads/status-selector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type LeadStatus = Doc<"leads">["status"]

type EditableField =
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "website"
  | "address"
  | "city"
  | "region"
  | "province"
  | "sourceDetail"
  | "consentSource"
  | "notes"

function formatLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

type FollowUpStatus = "overdue" | "due_today" | "upcoming" | null

function formatFollowUpDate(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

function getFollowUpStatus(nextFollowUpAt?: number): FollowUpStatus {
  if (nextFollowUpAt === undefined) {
    return null
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDate = new Date(nextFollowUpAt)
  const startOfDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

  if (startOfDueDate < startOfToday) {
    return "overdue"
  }

  if (startOfDueDate.getTime() === startOfToday.getTime()) {
    return "due_today"
  }

  return "upcoming"
}

type InlineEditableValueProps = {
  value?: string
  multiline?: boolean
  onSave: (value: string) => Promise<void>
}

function InlineEditableValue({ value, multiline = false, onSave }: InlineEditableValueProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const [optimisticValue, setOptimisticValue] = useState<string | null>(null)
  const displayValue = optimisticValue ?? value ?? ""

  useEffect(() => {
    if (!isEditing) {
      setDraft(value ?? "")
      setOptimisticValue(null)
    }
  }, [isEditing, value])

  async function saveValue() {
    const original = value ?? ""

    if (draft === original) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    setOptimisticValue(draft)
    setIsEditing(false)
    try {
      await onSave(draft)
    } catch (err) {
      setOptimisticValue(null)
      toast.error(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      event.currentTarget.blur()
      return
    }

    if (event.key === "Escape") {
      setDraft(value ?? "")
      setIsEditing(false)
    }
  }

  if (isEditing) {
    if (multiline) {
      return (
        <Textarea
          autoFocus
          value={draft}
          disabled={isSaving}
          className="min-h-20"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void saveValue()}
          onKeyDown={onKeyDown}
        />
      )
    }

    return (
      <Input
        autoFocus
        value={draft}
        disabled={isSaving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void saveValue()}
        onKeyDown={onKeyDown}
      />
    )
  }

  return (
    <button
      type="button"
      className="w-full rounded-sm px-1 py-0.5 text-left hover:bg-muted"
      disabled={isSaving}
      onClick={() => setIsEditing(true)}
    >
      {displayValue.trim() || "None"}
    </button>
  )
}

function StructuredDescriptionDisplay({
  data,
}: {
  data: { summary: string; specialties: string[]; certifications: string[] }
}) {
  const hasSpecialties = data.specialties.length > 0
  const hasCertifications = data.certifications.length > 0

  if (!hasSpecialties && !hasCertifications) return null

  return (
    <div className="space-y-1">
      {hasSpecialties ? (
        <p>
          <span className="font-medium">Specialties:</span>{" "}
          {data.specialties.join(", ")}
        </p>
      ) : null}
      {hasCertifications ? (
        <p>
          <span className="font-medium">Certifications:</span>{" "}
          {data.certifications.join(", ")}
        </p>
      ) : null}
    </div>
  )
}

function StructuredProductsDisplay({
  products,
}: {
  products: Array<{ name: string; category: string }>
}) {
  const grouped = new Map<string, string[]>()
  for (const product of products) {
    const existing = grouped.get(product.category) ?? []
    existing.push(product.name)
    grouped.set(product.category, existing)
  }

  return (
    <div className="space-y-1">
      {Array.from(grouped.entries()).map(([category, items]) => (
        <p key={category}>
          <span className="font-medium">{formatLabel(category)}:</span>{" "}
          {items.join(", ")}
        </p>
      ))}
    </div>
  )
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>()
  const leadId = params.id as Id<"leads">
  const lead = useQuery(api.leads.get, {
    leadId,
  })
  const cluster = useQuery(
    api.clusters.get,
    lead?.clusterId ? { clusterId: lead.clusterId } : "skip"
  )
  const updateLead = useMutation(api.leads.update)
  const updateLeadStatus = useMutation(api.leads.updateStatus)
  const activitiesPage = useQuery(api.activities.listByLead, {
    leadId,
  })
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const followUpStatus = lead !== undefined && lead !== null ? getFollowUpStatus(lead.nextFollowUpAt) : null

  async function updateField(field: EditableField, value: string) {
    try {
      await updateLead({
        leadId,
        [field]: value,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update field")
    }
  }

  async function updateSocialLink(field: "facebook" | "instagram", value: string) {
    try {
      await updateLead({
        leadId,
        socialLinks: {
          [field]: value,
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update social link")
    }
  }

  async function updateStatus(status: LeadStatus) {
    if (lead === undefined || lead === null || lead.status === status) {
      return
    }

    setIsUpdatingStatus(true)
    try {
      await updateLeadStatus({
        leadId,
        status,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <AppLayout>
      <section className="space-y-6">
        <div className="space-y-4">
          <Button asChild variant="outline">
            <Link href="/leads">Back to Leads</Link>
          </Button>

          {lead === undefined ? (
            <div className="rounded-xl border bg-background p-5 text-sm text-muted-foreground">Loading lead...</div>
          ) : lead === null ? (
            <div className="rounded-xl border bg-background p-5 text-sm text-muted-foreground">Lead not found.</div>
          ) : (
            <div className="rounded-xl border bg-background p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">{lead.name}</h2>
                <StatusSelector value={lead.status} disabled={isUpdatingStatus} onChange={updateStatus} />
                {followUpStatus === "overdue" ? (
                  <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                ) : followUpStatus === "due_today" ? (
                  <Badge className="bg-amber-100 text-amber-800">Due Today</Badge>
                ) : followUpStatus === "upcoming" ? (
                  <Badge className="bg-sky-100 text-sky-800">Due {formatFollowUpDate(lead.nextFollowUpAt!)}</Badge>
                ) : null}
                {cluster ? (
                  <Link href="/clusters">
                    <Badge variant="outline">{cluster.name}</Badge>
                  </Link>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {lead.city} • {formatLabel(lead.type)}
              </p>
            </div>
          )}
        </div>

        {lead !== undefined && lead !== null ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Info</CardTitle>
                  <CardDescription>Click a value to edit. Saves on blur or Enter.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    <InlineEditableValue
                      value={lead.contactName}
                      onSave={(value) => updateField("contactName", value)}
                    />
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    <InlineEditableValue
                      value={lead.contactEmail}
                      onSave={(value) => updateField("contactEmail", value)}
                    />
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    <InlineEditableValue
                      value={lead.contactPhone}
                      onSave={(value) => updateField("contactPhone", value)}
                    />
                  </p>
                  <p>
                    <span className="font-medium">Website:</span>{" "}
                    <InlineEditableValue
                      value={lead.website}
                      onSave={(value) => updateField("website", value)}
                    />
                  </p>
                  <p>
                    <span className="font-medium">Facebook:</span>{" "}
                    <span className="inline-flex items-center gap-1">
                      <InlineEditableValue
                        value={lead.socialLinks?.facebook}
                        onSave={(value) => updateSocialLink("facebook", value)}
                      />
                      {lead.socialLinks?.facebook?.trim() ? (
                        <a
                          href={lead.socialLinks.facebook.trim().startsWith("http") ? lead.socialLinks.facebook.trim() : `https://${lead.socialLinks.facebook.trim()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Open Facebook profile"
                        >
                          <Facebook className="h-4 w-4" />
                        </a>
                      ) : null}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Instagram:</span>{" "}
                    <span className="inline-flex items-center gap-1">
                      <InlineEditableValue
                        value={lead.socialLinks?.instagram}
                        onSave={(value) => updateSocialLink("instagram", value)}
                      />
                      {lead.socialLinks?.instagram?.trim() ? (
                        <a
                          href={lead.socialLinks.instagram.trim().startsWith("http") ? lead.socialLinks.instagram.trim() : `https://${lead.socialLinks.instagram.trim()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Open Instagram profile"
                        >
                          <Instagram className="h-4 w-4" />
                        </a>
                      ) : null}
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Details</CardTitle>
                  <CardDescription>Operational profile and sourcing metadata.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Address:</span>{" "}
                    <InlineEditableValue value={lead.address} onSave={(value) => updateField("address", value)} />
                  </p>
                  <p>
                    <span className="font-medium">City:</span>{" "}
                    <InlineEditableValue value={lead.city} onSave={(value) => updateField("city", value)} />
                  </p>
                  <p>
                    <span className="font-medium">Region:</span>{" "}
                    <InlineEditableValue value={lead.region} onSave={(value) => updateField("region", value)} />
                  </p>
                  <p>
                    <span className="font-medium">Province:</span>{" "}
                    <InlineEditableValue value={lead.province} onSave={(value) => updateField("province", value)} />
                  </p>
                  {lead.farmDescription ? (
                    <p>
                      <span className="font-medium">Description:</span>{" "}
                      {lead.farmDescription}
                    </p>
                  ) : null}
                  {(lead.enrichmentData as Record<string, unknown> | undefined)?.structuredDescription ? (
                    <StructuredDescriptionDisplay
                      data={(lead.enrichmentData as Record<string, unknown>).structuredDescription as { summary: string; specialties: string[]; certifications: string[] }}
                    />
                  ) : null}
                  <p>
                    <span className="font-medium">Products:</span> {lead.products?.join(", ") ?? "Unknown"}
                  </p>
                  {((lead.enrichmentData as Record<string, unknown> | undefined)?.structuredProducts as Array<{ name: string; category: string }> | undefined)?.length ? (
                    <StructuredProductsDisplay
                      products={(lead.enrichmentData as Record<string, unknown>).structuredProducts as Array<{ name: string; category: string }>}
                    />
                  ) : null}
                  <p>
                    <span className="font-medium">Sales channels:</span>{" "}
                    {lead.salesChannels?.join(", ") ?? "Unknown"}
                  </p>
                  <p>
                    <span className="font-medium">Sells online:</span> {lead.sellsOnline ? "Yes" : "No"}
                  </p>
                  <p>
                    <span className="font-medium">Lead source:</span> {formatLabel(lead.source)}
                  </p>
                  <p>
                    <span className="font-medium">Source detail:</span>{" "}
                    <InlineEditableValue
                      value={lead.sourceDetail}
                      onSave={(value) => updateField("sourceDetail", value)}
                    />
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Data Freshness</CardTitle>
                  <CardDescription>Enrichment status and data age.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataFreshness
                    leadId={leadId}
                    enrichedAt={lead.enrichedAt}
                    enrichmentSources={lead.enrichmentSources}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Follow-up Reminder</CardTitle>
                  <CardDescription>Schedule the next outreach date for this lead.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FollowUpReminder leadId={leadId} nextFollowUpAt={lead.nextFollowUpAt} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>CASL Consent Source</CardTitle>
                  <CardDescription>How this lead granted permission to contact.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <InlineEditableValue
                    multiline
                    value={lead.consentSource}
                    onSave={(value) => updateField("consentSource", value)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Internal Notes</CardTitle>
                  <CardDescription>Free-form notes for this lead.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <InlineEditableValue
                    multiline
                    value={lead.notes}
                    onSave={(value) => updateField("notes", value)}
                  />
                </CardContent>
              </Card>

              <Card id="activity">
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>Recent lead interactions and follow-up notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activitiesPage === undefined ? (
                    <p className="text-sm text-muted-foreground">Loading activity…</p>
                  ) : activitiesPage.activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity logged yet.</p>
                  ) : (
                    <ActivityTimeline
                      activities={activitiesPage.activities.map((activity) => ({
                        id: activity._id,
                        type: activity.type,
                        description: activity.description,
                        timestamp: activity.createdAt,
                        channel: activity.channel ?? null,
                      }))}
                    />
                  )}

                  <LogActivity leadId={leadId} />
                  <LogSocialActivity leadId={leadId} />
                  <LogSocialResponse leadId={leadId} />
                  <EmailComposer leadId={leadId} leadName={lead.name} />
                  <SocialDmComposer leadId={leadId} leadName={lead.name} />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </section>
    </AppLayout>
  )
}
