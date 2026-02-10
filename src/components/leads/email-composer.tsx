"use client"

import { useAction, useQuery } from "convex/react"
import { useState } from "react"
import { Loader2, Mail, Sparkles } from "lucide-react"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
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
                <span className="text-xs text-muted-foreground">{wordCount} words</span>
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
