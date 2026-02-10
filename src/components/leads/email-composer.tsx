"use client"

import { useAction, useQuery } from "convex/react"
import { useState } from "react"
import { ChevronDown, ChevronRight, Loader2, Mail, Sparkles } from "lucide-react"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

type EmailDraft = {
  subject: string
  body: string
  templateId: Id<"emailTemplates"> | null
  savedAt: number
}

type EmailComposerProps = {
  leadId: Id<"leads">
  leadName: string
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

type EnrichmentData = {
  structuredDescription?: {
    summary: string
    specialties: string[]
    certifications: string[]
  }
  structuredProducts?: Array<{ name: string; category: string }>
}

function FarmDetailsPanel({ leadId }: { leadId: Id<"leads"> }) {
  const lead = useQuery(api.leads.get, { leadId })
  const [isExpanded, setIsExpanded] = useState(false)

  if (!lead) return null

  const enrichment = lead.enrichmentData as EnrichmentData | undefined
  const hasProducts = (lead.products?.length ?? 0) > 0
  const hasChannels = (lead.salesChannels?.length ?? 0) > 0
  const hasDescription = Boolean(lead.farmDescription)
  const hasSpecialties = (enrichment?.structuredDescription?.specialties?.length ?? 0) > 0
  const hasCertifications = (enrichment?.structuredDescription?.certifications?.length ?? 0) > 0
  const hasEnrichedProducts = (enrichment?.structuredProducts?.length ?? 0) > 0
  const hasSocial = Boolean(lead.socialLinks?.instagram || lead.socialLinks?.facebook)

  const detailCount = [
    hasProducts,
    hasChannels,
    hasDescription,
    hasSpecialties,
    hasCertifications,
    hasEnrichedProducts,
    hasSocial,
  ].filter(Boolean).length

  return (
    <div className="rounded-md border">
      <button
        type="button"
        className="flex w-full items-center gap-2 p-3 text-left text-sm font-medium hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        Farm Details
        <Badge variant="secondary" className="ml-auto text-xs">
          {detailCount} {detailCount === 1 ? "detail" : "details"} available
        </Badge>
      </button>
      {isExpanded ? (
        <div className="space-y-2 border-t px-3 py-2 text-xs text-muted-foreground">
          <p><span className="font-medium text-foreground">Location:</span> {lead.city}</p>
          {lead.contactName ? (
            <p><span className="font-medium text-foreground">Contact:</span> {lead.contactName}</p>
          ) : null}
          {hasProducts ? (
            <p><span className="font-medium text-foreground">Products:</span> {lead.products!.join(", ")}</p>
          ) : null}
          {hasEnrichedProducts ? (
            <div>
              <span className="font-medium text-foreground">Enriched Products:</span>
              <span> {enrichment!.structuredProducts!.map((p) => p.name).join(", ")}</span>
            </div>
          ) : null}
          {hasChannels ? (
            <p><span className="font-medium text-foreground">Sales Channels:</span> {lead.salesChannels!.join(", ")}</p>
          ) : null}
          {lead.sellsOnline !== undefined ? (
            <p><span className="font-medium text-foreground">Sells Online:</span> {lead.sellsOnline ? "Yes" : "No"}</p>
          ) : null}
          {hasDescription ? (
            <p><span className="font-medium text-foreground">Description:</span> {lead.farmDescription}</p>
          ) : null}
          {hasSpecialties ? (
            <p><span className="font-medium text-foreground">Specialties:</span> {enrichment!.structuredDescription!.specialties.join(", ")}</p>
          ) : null}
          {hasCertifications ? (
            <p><span className="font-medium text-foreground">Certifications:</span> {enrichment!.structuredDescription!.certifications.join(", ")}</p>
          ) : null}
          {hasSocial ? (
            <p>
              <span className="font-medium text-foreground">Social:</span>{" "}
              {[
                lead.socialLinks?.instagram ? `IG: ${lead.socialLinks.instagram}` : "",
                lead.socialLinks?.facebook ? `FB: ${lead.socialLinks.facebook}` : "",
              ].filter(Boolean).join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function EmailComposer({ leadId, leadName }: EmailComposerProps) {
  const templates = useQuery(api.emailTemplates.list)
  const generateEmail = useAction(api.email.generateEmail.generateEmail)

  const [isOpen, setIsOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [draft, setDraft] = useState<EmailDraft | null>(null)

  function resetState() {
    setSelectedTemplateId("")
    setSubject("")
    setBody("")
    setIsGenerating(false)
    setGenerateError(null)
  }

  function handleOpenChange(open: boolean) {
    if (!open && isGenerating) {
      return
    }

    setIsOpen(open)

    if (open) {
      resetState()
    }
  }

  async function handleGenerate() {
    if (!selectedTemplateId) {
      return
    }

    setIsGenerating(true)
    setGenerateError(null)

    try {
      const result = await generateEmail({
        leadId,
        templateId: selectedTemplateId as Id<"emailTemplates">,
      })
      setSubject(result.subject)
      setBody(result.body)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate email"
      setGenerateError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSaveDraft() {
    const trimmedSubject = subject.trim()
    const trimmedBody = body.trim()

    if (!trimmedSubject || !trimmedBody) {
      return
    }

    const savedDraft: EmailDraft = {
      subject: trimmedSubject,
      body: trimmedBody,
      templateId: selectedTemplateId ? (selectedTemplateId as Id<"emailTemplates">) : null,
      savedAt: Date.now(),
    }

    setDraft(savedDraft)
    setIsOpen(false)
  }

  const wordCount = countWords(body)
  const hasContent = subject.trim().length > 0 && body.trim().length > 0

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        <Mail className="mr-2 size-4" />
        Compose Email
      </Button>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Compose Email</SheetTitle>
            <SheetDescription>Generate and edit an email for {leadName}.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            <FarmDetailsPanel leadId={leadId} />

            <div className="space-y-2">
              <Label htmlFor="email-template">Template</Label>
              <Select
                value={selectedTemplateId}
                disabled={isGenerating}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger id="email-template" className="w-full">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              disabled={!selectedTemplateId || isGenerating}
              className="w-full"
              onClick={() => void handleGenerate()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Generate
                </>
              )}
            </Button>

            {generateError ? (
              <p className="text-sm text-destructive">{generateError}</p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                disabled={isGenerating}
                placeholder="Email subject line"
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-body">Body</Label>
                <span className={`text-xs ${wordCount > 0 && (wordCount < 50 || wordCount > 125) ? "text-destructive" : "text-muted-foreground"}`}>{wordCount} words</span>
              </div>
              <Textarea
                id="email-body"
                value={body}
                disabled={isGenerating}
                placeholder="Email body content"
                className="min-h-48"
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isGenerating}
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isGenerating || !hasContent}
              onClick={handleSaveDraft}
            >
              Save Draft
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {draft ? (
        <p className="text-xs text-muted-foreground">
          Draft saved {new Date(draft.savedAt).toLocaleTimeString()}
        </p>
      ) : null}
    </>
  )
}
