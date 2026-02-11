"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"

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
import { FollowUpPrompt } from "./follow-up-prompt"

type SocialActivityType = "social_dm_sent" | "social_commented" | "social_followed"
type SocialChannel = "facebook" | "instagram"

type SocialAction = {
  label: string
  type: SocialActivityType
  channel: SocialChannel
}

const socialActions: SocialAction[] = [
  { label: "Log Facebook DM", type: "social_dm_sent", channel: "facebook" },
  { label: "Log Instagram DM", type: "social_dm_sent", channel: "instagram" },
  { label: "Log Facebook Comment", type: "social_commented", channel: "facebook" },
  { label: "Log Instagram Comment", type: "social_commented", channel: "instagram" },
  { label: "Log Follow", type: "social_followed", channel: "facebook" },
]

const dialogCopyByType: Record<
  SocialActivityType,
  { title: (channel: SocialChannel) => string; description: string }
> = {
  social_dm_sent: {
    title: (channel) => `Log ${channel === "facebook" ? "Facebook" : "Instagram"} DM`,
    description: "Record a direct message sent on this platform.",
  },
  social_commented: {
    title: (channel) => `Log ${channel === "facebook" ? "Facebook" : "Instagram"} Comment`,
    description: "Record a comment left on this platform.",
  },
  social_followed: {
    title: () => "Log Follow",
    description: "Record that you followed this lead on social media.",
  },
}

type LogSocialActivityProps = {
  leadId: Id<"leads">
  className?: string
}

export function LogSocialActivity({ leadId, className }: LogSocialActivityProps) {
  const createActivity = useMutation(api.activities.create)
  const [activeAction, setActiveAction] = useState<SocialAction | null>(null)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false)

  function openDialog(action: SocialAction) {
    setNotes("")
    setActiveAction(action)
  }

  function closeDialog() {
    if (isSubmitting) return
    setActiveAction(null)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (activeAction === null) return

    const description = notes.trim() || activeAction.label

    setIsSubmitting(true)
    try {
      await createActivity({
        leadId,
        type: activeAction.type,
        description,
        channel: activeAction.channel,
      })
      const wasDmSent = activeAction.type === "social_dm_sent"
      setActiveAction(null)
      setNotes("")
      if (wasDmSent) {
        setShowFollowUpPrompt(true)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log activity")
    } finally {
      setIsSubmitting(false)
    }
  }

  const dialogCopy = activeAction ? dialogCopyByType[activeAction.type] : null

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium">Social Activity</p>
      <div className="flex flex-wrap gap-2">
        {socialActions.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openDialog(action)}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <Dialog
        open={activeAction !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogCopy && activeAction ? dialogCopy.title(activeAction.channel) : ""}
            </DialogTitle>
            <DialogDescription>{dialogCopy?.description}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="social-activity-notes">Notes (optional)</Label>
              <Textarea
                id="social-activity-notes"
                value={notes}
                disabled={isSubmitting}
                placeholder="Add any details..."
                className="min-h-20"
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Log Activity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <FollowUpPrompt
        leadId={leadId}
        open={showFollowUpPrompt}
        onOpenChange={setShowFollowUpPrompt}
      />
    </div>
  )
}
