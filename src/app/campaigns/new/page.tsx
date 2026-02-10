"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  MapPin,
  Users,
} from "lucide-react"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"

import { AppLayout } from "@/components/layout/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"

const STEPS = [
  { id: 1, label: "Name" },
  { id: 2, label: "Select Leads" },
  { id: 3, label: "Template Sequence" },
  { id: 4, label: "Confirm" },
] as const

type SelectionMode = "cluster" | "filter" | "manual"

type LeadStatus =
  | "new_lead"
  | "enriched"
  | "outreach_started"
  | "replied"
  | "meeting_booked"
  | "onboarded"
  | "declined"
  | "not_interested"
  | "bounced"
  | "no_response"
  | "no_email"

type LeadType = "farm" | "farmers_market" | "retail_store" | "roadside_stand" | "other"

type SequenceType = "initial" | "follow_up_1" | "follow_up_2" | "follow_up_3"

type LeadSummary = {
  _id: Id<"leads">
  name: string
  type: LeadType
  city: string
  region: string
  status: LeadStatus
  contactEmail?: string
  clusterId?: Id<"clusters">
}

type Template = {
  _id: Id<"emailTemplates">
  name: string
  sequenceType: SequenceType
  subject: string
  prompt: string
  isDefault: boolean
}

type Cluster = {
  _id: Id<"clusters">
  name: string
  leadCount: number
}

const SEQUENCE_STEPS: { type: SequenceType; label: string; delay: string }[] = [
  { type: "initial", label: "Initial Email", delay: "Day 0" },
  { type: "follow_up_1", label: "Follow-up 1", delay: "Day 3–4" },
  { type: "follow_up_2", label: "Follow-up 2", delay: "Day 7–8" },
  { type: "follow_up_3", label: "Follow-up 3", delay: "Day 14" },
]

const LEAD_STATUSES: LeadStatus[] = [
  "new_lead",
  "enriched",
  "outreach_started",
  "replied",
  "meeting_booked",
  "onboarded",
  "declined",
  "not_interested",
  "bounced",
  "no_response",
  "no_email",
]

const LEAD_TYPES: LeadType[] = [
  "farm",
  "farmers_market",
  "retail_store",
  "roadside_stand",
  "other",
]

function toLabel(value: string) {
  return value
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

const statusStyles: Record<LeadStatus, string> = {
  new_lead: "bg-blue-100 text-blue-800",
  enriched: "bg-indigo-100 text-indigo-800",
  outreach_started: "bg-amber-100 text-amber-800",
  replied: "bg-violet-100 text-violet-800",
  meeting_booked: "bg-emerald-100 text-emerald-800",
  onboarded: "bg-green-100 text-green-800",
  declined: "bg-rose-100 text-rose-800",
  not_interested: "bg-zinc-200 text-zinc-800",
  bounced: "bg-red-100 text-red-800",
  no_response: "bg-orange-100 text-orange-800",
  no_email: "bg-stone-200 text-stone-800",
}

export default function NewCampaignPage() {
  const router = useRouter()
  const createCampaign = useMutation(
    api.campaigns.create,
  )
  const leads = useQuery(api.leads.listAllSummary) as LeadSummary[] | undefined
  const templates = useQuery(api.emailTemplates.list) as Template[] | undefined
  const clusters = useQuery(api.clusters.list) as Cluster[] | undefined

  // Step state
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Name
  const [campaignName, setCampaignName] = useState("")

  // Step 2: Lead selection
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("cluster")
  const [selectedClusterId, setSelectedClusterId] = useState<Id<"clusters"> | "">("")
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all")
  const [filterType, setFilterType] = useState<LeadType | "all">("all")
  const [filterRegion, setFilterRegion] = useState<string>("all")
  const [manualSelectedIds, setManualSelectedIds] = useState<Set<string>>(new Set())
  const [manualSearch, setManualSearch] = useState("")

  // Step 3: Template sequence
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<
    Record<SequenceType, Id<"emailTemplates"> | "">
  >({
    initial: "",
    follow_up_1: "",
    follow_up_2: "",
    follow_up_3: "",
  })

  // Derived data
  const regions = useMemo(() => {
    if (!leads) return []
    const unique = [...new Set(leads.map((l) => l.region))].sort()
    return unique
  }, [leads])

  const resolvedLeadCount = useMemo(() => {
    if (!leads) return 0
    if (selectionMode === "cluster") {
      if (!selectedClusterId) return 0
      return leads.filter((l) => l.clusterId === selectedClusterId).length
    }
    if (selectionMode === "filter") {
      return leads.filter((l) => {
        if (filterStatus !== "all" && l.status !== filterStatus) return false
        if (filterType !== "all" && l.type !== filterType) return false
        if (filterRegion !== "all" && l.region !== filterRegion) return false
        return true
      }).length
    }
    return manualSelectedIds.size
  }, [leads, selectionMode, selectedClusterId, filterStatus, filterType, filterRegion, manualSelectedIds])

  const filteredManualLeads = useMemo(() => {
    if (!leads) return []
    const search = manualSearch.trim().toLowerCase()
    if (!search) return leads
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(search) ||
        l.city.toLowerCase().includes(search) ||
        l.region.toLowerCase().includes(search)
    )
  }, [leads, manualSearch])

  const activeTemplateIds = useMemo(() => {
    const ids: Id<"emailTemplates">[] = []
    for (const seqStep of SEQUENCE_STEPS) {
      const id = selectedTemplateIds[seqStep.type]
      if (id) ids.push(id)
      else break
    }
    return ids
  }, [selectedTemplateIds])

  const templatesByType = useMemo(() => {
    if (!templates) return {} as Record<SequenceType, Template[]>
    const map: Record<SequenceType, Template[]> = {
      initial: [],
      follow_up_1: [],
      follow_up_2: [],
      follow_up_3: [],
    }
    for (const t of templates) {
      map[t.sequenceType].push(t)
    }
    return map
  }, [templates])

  // Validation
  const canProceed = useMemo(() => {
    if (step === 1) return campaignName.trim().length > 0
    if (step === 2) return resolvedLeadCount > 0
    if (step === 3) return activeTemplateIds.length > 0
    return true
  }, [step, campaignName, resolvedLeadCount, activeTemplateIds])

  function handleNext() {
    if (step < 4) setStep(step + 1)
  }

  function handleBack() {
    if (step > 1) setStep(step - 1)
  }

  function toggleManualLead(leadId: string) {
    setManualSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  function toggleAllManual(checked: boolean) {
    if (checked) {
      setManualSelectedIds(new Set(filteredManualLeads.map((l) => l._id)))
    } else {
      setManualSelectedIds(new Set())
    }
  }

  async function handleCreate() {
    setIsSubmitting(true)
    try {
      const args: {
        name: string
        templateIds: Id<"emailTemplates">[]
        leadCount: number
        targetClusterId?: Id<"clusters">
        targetFilter?: { status?: string; type?: string; region?: string }
        targetLeadIds?: Id<"leads">[]
      } = {
        name: campaignName.trim(),
        templateIds: activeTemplateIds,
        leadCount: resolvedLeadCount,
      }

      if (selectionMode === "cluster" && selectedClusterId) {
        args.targetClusterId = selectedClusterId as Id<"clusters">
        // Resolve concrete lead IDs so downstream queries/actions work
        const clusterLeadIds = leads!
          .filter((l) => l.clusterId === selectedClusterId)
          .map((l) => l._id)
        args.targetLeadIds = clusterLeadIds as Id<"leads">[]
      } else if (selectionMode === "filter") {
        args.targetFilter = {
          ...(filterStatus !== "all" && { status: filterStatus }),
          ...(filterType !== "all" && { type: filterType }),
          ...(filterRegion !== "all" && { region: filterRegion }),
        }
        // Resolve concrete lead IDs so downstream queries/actions work
        const filteredLeadIds = leads!
          .filter((l) => {
            if (filterStatus !== "all" && l.status !== filterStatus) return false
            if (filterType !== "all" && l.type !== filterType) return false
            if (filterRegion !== "all" && l.region !== filterRegion) return false
            return true
          })
          .map((l) => l._id)
        args.targetLeadIds = filteredLeadIds as Id<"leads">[]
      } else if (selectionMode === "manual") {
        args.targetLeadIds = [...manualSelectedIds] as Id<"leads">[]
      }

      await createCampaign(args)
      toast.success("Campaign draft created")
      router.push("/campaigns")
    } catch {
      toast.error("Failed to create campaign")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = leads === undefined || templates === undefined || clusters === undefined

  return (
    <AppLayout title="New Campaign">
      <div className="w-full max-w-3xl space-y-6">
        {/* Step indicator */}
        <nav aria-label="Campaign creation steps" className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id)
                }}
                disabled={s.id > step}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  s.id === step
                    ? "bg-primary text-primary-foreground"
                    : s.id < step
                      ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s.id < step ? (
                  <Check className="size-3.5" />
                ) : (
                  <span className="grid size-5 place-items-center rounded-full bg-background/20 text-xs">
                    {s.id}
                  </span>
                )}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <Separator className="w-6" />
              )}
            </div>
          ))}
        </nav>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Step 1: Name */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Name your campaign</CardTitle>
                  <CardDescription>
                    Give this campaign a descriptive name so you can find it later.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign name</Label>
                    <Input
                      id="campaign-name"
                      placeholder="e.g. Ontario Farm Outreach - Spring 2026"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Select Leads */}
            {step === 2 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Select leads</CardTitle>
                    <CardDescription>
                      Choose how to target leads for this campaign.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant={selectionMode === "cluster" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectionMode("cluster")}
                      >
                        <MapPin className="size-3.5" />
                        By Cluster
                      </Button>
                      <Button
                        variant={selectionMode === "filter" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectionMode("filter")}
                      >
                        <Filter className="size-3.5" />
                        By Filter
                      </Button>
                      <Button
                        variant={selectionMode === "manual" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectionMode("manual")}
                      >
                        <Users className="size-3.5" />
                        Manual
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {selectionMode === "cluster" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Choose a cluster</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={selectedClusterId || "placeholder"}
                        onValueChange={(v) =>
                          setSelectedClusterId(v === "placeholder" ? "" : (v as Id<"clusters">))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a cluster" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placeholder" disabled>
                            Select a cluster
                          </SelectItem>
                          {clusters!.map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name} ({c.leadCount} leads)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                )}

                {selectionMode === "filter" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Filter leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        <div className="space-y-1.5">
                          <Label>Status</Label>
                          <Select
                            value={filterStatus}
                            onValueChange={(v) => setFilterStatus(v as LeadStatus | "all")}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              {LEAD_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {toLabel(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Type</Label>
                          <Select
                            value={filterType}
                            onValueChange={(v) => setFilterType(v as LeadType | "all")}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              {LEAD_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {toLabel(t)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Region</Label>
                          <Select
                            value={filterRegion}
                            onValueChange={(v) => setFilterRegion(v)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Regions</SelectItem>
                              {regions.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectionMode === "manual" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Select leads manually</CardTitle>
                      <CardDescription>
                        Search and check the leads you want to include.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Input
                          placeholder="Search by name, city, or region..."
                          value={manualSearch}
                          onChange={(e) => setManualSearch(e.target.value)}
                        />
                        <div className="max-h-[400px] overflow-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">
                                  <Checkbox
                                    checked={
                                      filteredManualLeads.length > 0 &&
                                      filteredManualLeads.every((l) =>
                                        manualSelectedIds.has(l._id)
                                      )
                                    }
                                    onCheckedChange={(v) => toggleAllManual(v === true)}
                                    aria-label="Select all"
                                  />
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredManualLeads.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={5}
                                    className="text-center text-muted-foreground"
                                  >
                                    No leads found.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredManualLeads.map((lead) => (
                                  <TableRow key={lead._id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={manualSelectedIds.has(lead._id)}
                                        onCheckedChange={() => toggleManualLead(lead._id)}
                                        aria-label={`Select ${lead.name}`}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium">{lead.name}</TableCell>
                                    <TableCell>{toLabel(lead.type)}</TableCell>
                                    <TableCell>{lead.city}</TableCell>
                                    <TableCell>
                                      <Badge className={statusStyles[lead.status]}>
                                        {toLabel(lead.status)}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-3">
                  <Users className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {resolvedLeadCount} lead{resolvedLeadCount !== 1 ? "s" : ""} selected
                  </span>
                </div>
              </div>
            )}

            {/* Step 3: Template Sequence */}
            {step === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Choose template sequence</CardTitle>
                    <CardDescription>
                      Select templates for each step of the email sequence. You must choose at
                      least the initial email. Follow-ups are optional.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {SEQUENCE_STEPS.map((seqStep, idx) => {
                        const available = templatesByType[seqStep.type] ?? []
                        const prevSelected =
                          idx === 0 || selectedTemplateIds[SEQUENCE_STEPS[idx - 1].type] !== ""
                        const isDisabled = !prevSelected

                        return (
                          <div key={seqStep.type} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {seqStep.delay}
                              </Badge>
                              <Label>{seqStep.label}</Label>
                              {idx === 0 && (
                                <span className="text-xs text-muted-foreground">(required)</span>
                              )}
                            </div>
                            <Select
                              value={selectedTemplateIds[seqStep.type] || "none"}
                              onValueChange={(v) =>
                                setSelectedTemplateIds((prev) => {
                                  const next = { ...prev }
                                  if (v === "none") {
                                    next[seqStep.type] = ""
                                    // Clear downstream selections
                                    for (let i = idx + 1; i < SEQUENCE_STEPS.length; i++) {
                                      next[SEQUENCE_STEPS[i].type] = ""
                                    }
                                  } else {
                                    next[seqStep.type] = v as Id<"emailTemplates">
                                  }
                                  return next
                                })
                              }
                              disabled={isDisabled}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${seqStep.label.toLowerCase()} template`} />
                              </SelectTrigger>
                              <SelectContent>
                                {idx > 0 && (
                                  <SelectItem value="none">Skip this step</SelectItem>
                                )}
                                {available.map((t) => (
                                  <SelectItem key={t._id} value={t._id}>
                                    {t.name}
                                    {t.isDefault ? " (Default)" : ""}
                                  </SelectItem>
                                ))}
                                {available.length === 0 && (
                                  <SelectItem value="__empty" disabled>
                                    No templates for this step
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Sequence preview */}
                {activeTemplateIds.length > 0 && (
                  <SequencePreview
                    templateIds={activeTemplateIds}
                    templates={templates!}
                  />
                )}
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Confirm campaign</CardTitle>
                  <CardDescription>
                    Review your campaign details before creating the draft.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Campaign Name</dt>
                      <dd className="mt-0.5 text-sm">{campaignName}</dd>
                    </div>
                    <Separator />
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Lead Selection
                      </dt>
                      <dd className="mt-0.5 text-sm">
                        {selectionMode === "cluster" && (
                          <>
                            Cluster:{" "}
                            {clusters!.find((c) => c._id === selectedClusterId)?.name ??
                              "Unknown"}
                          </>
                        )}
                        {selectionMode === "filter" && (
                          <span>
                            Filter —{" "}
                            {[
                              filterStatus !== "all" && `Status: ${toLabel(filterStatus)}`,
                              filterType !== "all" && `Type: ${toLabel(filterType)}`,
                              filterRegion !== "all" && `Region: ${filterRegion}`,
                            ]
                              .filter(Boolean)
                              .join(", ") || "All leads"}
                          </span>
                        )}
                        {selectionMode === "manual" && "Manual selection"}
                      </dd>
                      <dd className="mt-1 text-sm font-medium">
                        {resolvedLeadCount} lead{resolvedLeadCount !== 1 ? "s" : ""}
                      </dd>
                    </div>
                    <Separator />
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Email Sequence
                      </dt>
                      <dd className="mt-1 space-y-1.5">
                        {SEQUENCE_STEPS.map((seqStep) => {
                          const templateId = selectedTemplateIds[seqStep.type]
                          if (!templateId) return null
                          const tmpl = templates!.find((t) => t._id === templateId)
                          return (
                            <div
                              key={seqStep.type}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Badge variant="outline" className="text-xs">
                                {seqStep.delay}
                              </Badge>
                              <span>{tmpl?.name ?? "Unknown"}</span>
                            </div>
                          )
                        })}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleBack} disabled={step === 1}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              {step < 4 ? (
                <Button onClick={handleNext} disabled={!canProceed}>
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={isSubmitting || !canProceed}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Create Draft
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}

function SequencePreview({
  templateIds,
  templates,
}: {
  templateIds: Id<"emailTemplates">[]
  templates: Template[]
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sequence Preview</CardTitle>
        <CardDescription>
          {templateIds.length} step{templateIds.length !== 1 ? "s" : ""} in this sequence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {templateIds.map((id, idx) => {
            const tmpl = templates.find((t) => t._id === id)
            if (!tmpl) return null
            const seqStep = SEQUENCE_STEPS[idx]
            const isExpanded = expanded === idx

            return (
              <div key={id} className="rounded-md border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                  onClick={() => setExpanded(isExpanded ? null : idx)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {seqStep.delay}
                    </Badge>
                    <span className="font-medium">{tmpl.name}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </button>
                {isExpanded && (
                  <div className="border-t px-3 py-2 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Subject:</span>{" "}
                      {tmpl.subject}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
