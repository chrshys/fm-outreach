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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { FollowUpPrompt } from "./follow-up-prompt"

type ManualActivityType = "note_added" | "phone_call" | "social_dm_sent"
type SocialChannel = "facebook" | "instagram"

type LogActivityProps = {
  leadId: Id<"leads">
  className?: string
}

const dialogCopyByType: Record<
  ManualActivityType,
  {
    title: string
    description: string
    submitLabel: string
  }
> = {
  note_added: {
    title: "Add Note",
    description: "Capture any context for this lead.",
    submitLabel: "Save Note",
  },
  phone_call: {
    title: "Log Call",
    description: "Record what happened on the call.",
    submitLabel: "Save Call",
  },
  social_dm_sent: {
    title: "Log Social DM",
    description: "Record the direct message and platform.",
    submitLabel: "Save DM",
  },
}

function getChannelForType(type: ManualActivityType, socialChannel: SocialChannel) {
  if (type === "phone_call") {
    return "phone" as const
  }

  if (type === "social_dm_sent") {
    return socialChannel
  }

  return undefined
}

export function LogActivity({ leadId, className }: LogActivityProps) {
  const createActivity = useMutation(api.activities.create)
  const [openDialogType, setOpenDialogType] = useState<ManualActivityType | null>(null)
  const [description, setDescription] = useState("")
  const [socialChannel, setSocialChannel] = useState<SocialChannel>("facebook")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false)

  function openDialog(type: ManualActivityType) {
    setDescription("")
    setSocialChannel("facebook")
    setOpenDialogType(type)
  }

  function closeDialog() {
    if (isSubmitting) {
      return
    }

    setOpenDialogType(null)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (openDialogType === null) {
      return
    }

    const trimmedDescription = description.trim()
    if (trimmedDescription.length === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const channel = getChannelForType(openDialogType, socialChannel)
      const payload: {
        leadId: Id<"leads">
        type: ManualActivityType
        description: string
        channel?: "phone" | "facebook" | "instagram"
      } = {
        leadId,
        type: openDialogType,
        description: trimmedDescription,
      }

      if (channel !== undefined) {
        payload.channel = channel
      }

      await createActivity(payload)
      const wasDmSent = openDialogType === "social_dm_sent"
      setOpenDialogType(null)
      setDescription("")
      setSocialChannel("facebook")
      if (wasDmSent) {
        setShowFollowUpPrompt(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const dialogCopy = openDialogType ? dialogCopyByType[openDialogType] : null

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => openDialog("note_added")}>
          Add Note
        </Button>
        <Button type="button" variant="outline" onClick={() => openDialog("phone_call")}>
          Log Call
        </Button>
        <Button type="button" variant="outline" onClick={() => openDialog("social_dm_sent")}>
          Log Social DM
        </Button>
      </div>

      <Dialog
        open={openDialogType !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDialog()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogCopy?.title}</DialogTitle>
            <DialogDescription>{dialogCopy?.description}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="activity-description">Description</Label>
              <Textarea
                id="activity-description"
                required
                value={description}
                disabled={isSubmitting}
                placeholder="What happened?"
                className="min-h-28"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            {openDialogType === "social_dm_sent" ? (
              <div className="space-y-2">
                <Label htmlFor="social-channel">Channel</Label>
                <Select value={socialChannel} onValueChange={(value) => setSocialChannel(value as SocialChannel)}>
                  <SelectTrigger id="social-channel" className="w-full">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || description.trim().length === 0}>
                {dialogCopy?.submitLabel}
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
