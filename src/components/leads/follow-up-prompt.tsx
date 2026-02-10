"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import type { FormEvent } from "react"
import { CalendarClock } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function getDefaultFollowUpDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 3)
  return date.toISOString().slice(0, 10)
}

function parseDateInputValue(dateInput: string) {
  const [yearValue, monthValue, dayValue] = dateInput.split("-")
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  return new Date(year, month - 1, day).getTime()
}

type FollowUpPromptProps = {
  leadId: Id<"leads">
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FollowUpPrompt({ leadId, open, onOpenChange }: FollowUpPromptProps) {
  const setFollowUp = useMutation(api.leads.setFollowUp)
  const [dateInput, setDateInput] = useState(getDefaultFollowUpDate)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) return
    if (nextOpen) {
      setDateInput(getDefaultFollowUpDate())
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (dateInput.length === 0) return

    setIsSubmitting(true)
    try {
      await setFollowUp({
        leadId,
        nextFollowUpAt: parseDateInputValue(dateInput),
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSkip() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5" />
            Set follow-up reminder?
          </DialogTitle>
          <DialogDescription>
            Schedule a follow-up for this lead. Defaults to 3 days from now.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="follow-up-prompt-date">Follow-up date</Label>
            <Input
              id="follow-up-prompt-date"
              type="date"
              required
              disabled={isSubmitting}
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" disabled={isSubmitting} onClick={handleSkip}>
              Skip
            </Button>
            <Button type="submit" disabled={isSubmitting || dateInput.length === 0}>
              Set Reminder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
