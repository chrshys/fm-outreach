"use client"

import { useAction, useMutation } from "convex/react"
import { useRef, useState } from "react"
import { Check, ClipboardCopy, Loader2, MessageCircle, Sparkles } from "lucide-react"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { FollowUpPrompt } from "./follow-up-prompt"
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

type SocialChannel = "facebook" | "instagram"

type SocialDmComposerProps = {
  leadId: Id<"leads">
  leadName: string
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function SocialDmComposer({ leadId, leadName }: SocialDmComposerProps) {
  const generateDM = useAction(api.social.generateDM.generateDM)
  const createActivity = useMutation(api.activities.create)

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [channel, setChannel] = useState<SocialChannel | "">("")
  const [dmText, setDmText] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showLogPrompt, setShowLogPrompt] = useState(false)
  const [isLogging, setIsLogging] = useState(false)
  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false)

  function resetState() {
    setChannel("")
    setDmText("")
    setIsGenerating(false)
    setGenerateError(null)
    setCopied(false)
    setShowLogPrompt(false)
    setIsLogging(false)
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = null
    }
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
    if (!channel) {
      return
    }

    setIsGenerating(true)
    setGenerateError(null)
    setCopied(false)
    setShowLogPrompt(false)

    try {
      const result = await generateDM({
        leadId,
        channel,
      })
      setDmText(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate DM"
      setGenerateError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCopy() {
    if (!dmText.trim()) {
      return
    }

    try {
      await navigator.clipboard.writeText(dmText)
    } catch {
      return
    }

    setCopied(true)
    setShowLogPrompt(true)

    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false)
      copyTimeoutRef.current = null
    }, 2000)
  }

  async function handleLogActivity() {
    if (!channel || !dmText.trim()) {
      return
    }

    setIsLogging(true)
    try {
      await createActivity({
        leadId,
        type: "social_dm_sent",
        description: dmText,
        channel,
      })
      setShowLogPrompt(false)
      setIsOpen(false)
      setShowFollowUpPrompt(true)
    } finally {
      setIsLogging(false)
    }
  }

  const wordCount = countWords(dmText)

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        <MessageCircle className="mr-2 size-4" />
        Draft Social DM
      </Button>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Draft Social DM</SheetTitle>
            <SheetDescription>Generate and send a direct message to {leadName}.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            <div className="space-y-2">
              <Label htmlFor="dm-channel">Channel</Label>
              <Select
                value={channel}
                disabled={isGenerating}
                onValueChange={(value) => setChannel(value as SocialChannel)}
              >
                <SelectTrigger id="dm-channel" className="w-full">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              disabled={!channel || isGenerating}
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
                  Generate DM
                </>
              )}
            </Button>

            {generateError ? (
              <p className="text-sm text-destructive">{generateError}</p>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dm-text">Message</Label>
                <span className={`text-xs ${wordCount > 0 && (wordCount < 30 || wordCount > 60) ? "text-destructive" : "text-muted-foreground"}`}>{wordCount} words</span>
              </div>
              <Textarea
                id="dm-text"
                value={dmText}
                disabled={isGenerating}
                placeholder="Generated message will appear here"
                className="min-h-32"
                onChange={(e) => {
                  setDmText(e.target.value)
                  setCopied(false)
                  setShowLogPrompt(false)
                }}
              />
            </div>

            {showLogPrompt ? (
              <div className="rounded-md border border-border bg-muted/50 p-3">
                <p className="mb-2 text-sm font-medium">Message copied! Log this activity?</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isLogging}
                    onClick={() => void handleLogActivity()}
                  >
                    {isLogging ? "Logging…" : "Log Activity"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isLogging}
                    onClick={() => setShowLogPrompt(false)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}
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
              disabled={isGenerating || !dmText.trim()}
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <>
                  <Check className="mr-2 size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardCopy className="mr-2 size-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <FollowUpPrompt
        leadId={leadId}
        open={showFollowUpPrompt}
        onOpenChange={setShowFollowUpPrompt}
      />
    </>
  )
}
