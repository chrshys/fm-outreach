"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import type { FormEvent } from "react"

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type SocialChannel = "facebook" | "instagram"

type LogSocialResponseProps = {
  leadId: Id<"leads">
  className?: string
}

export function LogSocialResponse({ leadId, className }: LogSocialResponseProps) {
  // @ts-expect-error — deep type instantiation in generated Convex API types
  const createActivity = useMutation(api.activities.create)
  const [open, setOpen] = useState(false)
  const [channel, setChannel] = useState<SocialChannel>("facebook")
  const [summary, setSummary] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function openDialog(ch: SocialChannel) {
    setSummary("")
    setChannel(ch)
    setOpen(true)
  }

  function closeDialog() {
    if (isSubmitting) return
    setOpen(false)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = summary.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    try {
      await createActivity({
        leadId,
        type: "social_dm_replied" as const,
        description: trimmed,
        channel,
      })
      setOpen(false)
      setSummary("")
    } finally {
      setIsSubmitting(false)
    }
  }

  const channelLabel = channel === "facebook" ? "Facebook" : "Instagram"

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium">Log Response</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => openDialog("facebook")}>
          Log Facebook Response
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => openDialog("instagram")}>
          Log Instagram Response
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) closeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log {channelLabel} Response</DialogTitle>
            <DialogDescription>
              Record a response received via {channelLabel}. If the lead is in outreach or no-email status, it will automatically advance to replied.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="social-response-summary">Response Summary</Label>
              <Textarea
                id="social-response-summary"
                value={summary}
                disabled={isSubmitting}
                placeholder="Summarize the response received..."
                className="min-h-20"
                onChange={(event) => setSummary(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !summary.trim()}>
                Log Response
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
